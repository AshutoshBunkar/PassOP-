import connectDB from "../_mongo";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

export default async function handler(req, res) {
  try {
    const db = await connectDB();

    /* 🔐 Verify JWT */
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.decode(token);

    if (!decoded?.sub) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const auth0Id = decoded.sub;

    const users = db.collection("users");

    /* 🔍 Find user */
    let user = await users.findOne({ auth0Id });

    /* 🆕 Create if not exists */
    if (!user) {
      const salt = randomBytes(16).toString("hex");

      const newUser = {
        auth0Id,
        salt,
        createdAt: new Date(),
        failedAttempts: 0,
        lockUntil: null,
      };

      await users.insertOne(newUser);

      user = newUser;
    }

    /* 📤 Return salt */
    return res.status(200).json({
      salt: user.salt,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
}
