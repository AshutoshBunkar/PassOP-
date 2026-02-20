import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    /* 🔐 Verify Auth0 JWT */
    const user = await verifyJwt(req);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const auth0Id = user.sub;

    const users = db.collection("Users");

    /* 🔍 Find user */
    let userDoc = await users.findOne({ auth0Id });

    /* 🆕 Create if first login */
    if (!userDoc) {
      const salt = crypto
        .randomBytes(16)
        .toString("hex");

      const newUser = {
        auth0Id,
        salt,
        createdAt: new Date(),
        failedAttempts: 0,
        lockUntil: null,
      };

      await users.insertOne(newUser);

      userDoc = newUser;

      console.log("🆕 New user created");
    }

    /* 📤 Return salt */
    return res.status(200).json({
      salt: userDoc.salt,
    });

  } catch (err) {
    console.error("USERS ERROR:", err);

    return res.status(401).json({
      error: "Unauthorized",
    });
  }
}