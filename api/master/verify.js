import bcrypt from "bcryptjs";

import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 min

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    /* 🔐 Auth */
    const payload = await verifyJwt(req);
    const auth0Id = payload.sub;

    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing password",
      });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const users = db.collection("Users");

    const user = await users.findOne({ auth0Id });

    if (!user || !user.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    /* 🔒 Check lock */
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMs = user.lockUntil - Date.now();

      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);

      return res.status(403).json({
        success: false,
        locked: true,
        message: "Account locked",
        minutes,
        seconds,
      });
    }

    /* 🔑 Verify */
    const ok = await bcrypt.compare(
      masterPassword,
      user.masterHash
    );

    /* ❌ Wrong password */
    if (!ok) {
      const attempts = (user.failedAttempts || 0) + 1;
      const remaining = MAX_ATTEMPTS - attempts;

      /* 🚫 Lock */
      if (attempts >= MAX_ATTEMPTS) {
        await users.updateOne(
          { auth0Id },
          {
            $set: {
              lockUntil: Date.now() + LOCK_TIME,
              failedAttempts: 0,
            },
          }
        );

        return res.status(403).json({
          success: false,
          locked: true,
          message: "Account locked for 15 minutes",
          remaining: 0,
        });
      }

      /* ⏳ Save attempts */
      await users.updateOne(
        { auth0Id },
        {
          $set: { failedAttempts: attempts },
        }
      );

      return res.status(401).json({
        success: false,
        locked: false,
        remaining,
        message: `Invalid password. ${remaining} attempts left.`,
      });
    }

    /* ✅ Success → reset */
    await users.updateOne(
      { auth0Id },
      {
        $set: {
          failedAttempts: 0,
          lockUntil: null,
        },
      }
    );

    return res.json({
      success: true,
      message: "Verified",
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}