import bcrypt from "bcryptjs";

import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";
import {
  deriveKey,
  encryptPassword,
  decryptPassword,
} from "../utils/crypto.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    /* 🔐 Verify token */
    const payload = await verifyJwt(req);

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false });
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const auth0Id = payload.sub;

    const users = db.collection("Users");
    const passwords = db.collection("Passwords");

    /* 📄 Get user from DB */
    const userDoc = await users.findOne({ auth0Id });

    if (!userDoc || !userDoc.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    /* 🔐 Verify old master */
    const ok = await bcrypt.compare(
      oldPassword,
      userDoc.masterHash
    );

    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Old password incorrect",
      });
    }

    /* 🔑 Re-encrypt vault */
    const oldKey = deriveKey(
      oldPassword,
      userDoc.salt
    );

    const newKey = deriveKey(
      newPassword,
      userDoc.salt
    );

    const vault = await passwords
      .find({ userId: auth0Id })
      .toArray();

    for (const item of vault) {
      const dec = decryptPassword(
        item.password,
        oldKey
      );

      const enc = encryptPassword(
        dec,
        newKey
      );

      await passwords.updateOne(
        { _id: item._id },
        {
          $set: {
            password: enc,
            updatedAt: new Date(),
          },
        }
      );
    }

    /* 🔒 Update hash */
    const hash = await bcrypt.hash(
      newPassword,
      10
    );

    await users.updateOne(
      { auth0Id },
      {
        $set: {
          masterHash: hash,
          updatedAt: new Date(),
        },
      }
    );

    return res.json({ success: true });

  } catch (err) {
    console.error("CHANGE MASTER ERROR:", err);

    return res.status(500).json({
      success: false,
    });
  }
}