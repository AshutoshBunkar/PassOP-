import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";

export default async function handler(req, res) {
  try {
    // 🔐 Auth
    const user = await verifyJwt(req);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const userId = user.sub;

    const passwords = db.collection("Passwords");

    /* ================= GET ================= */
    if (req.method === "GET") {
      const data = await passwords
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      return res.json({
        success: true,
        result: data,
      });
    }

    /* ================= POST ================= */
    if (req.method === "POST") {
      const { site, username, password } = req.body;

      if (!site || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields required",
        });
      }

      const newPass = {
        site,
        username,
        password,
        userId,
        createdAt: new Date(),
      };

      const result = await passwords.insertOne(newPass);

      return res.json({
        success: true,
        result: {
          ...newPass,
          _id: result.insertedId,
        },
      });
    }

    return res.status(405).end();

  } catch (err) {
    console.error("PASSWORDS INDEX ERROR:", err);

    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }
}