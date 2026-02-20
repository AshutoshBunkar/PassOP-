import { ObjectId } from "mongodb";

import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";

export default async function handler(req, res) {
  try {
    const user = await verifyJwt(req);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const userId = user.sub;

    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid ID",
      });
    }

    const passwords = db.collection("Passwords");

    /* ================= DELETE ================= */
    if (req.method === "DELETE") {
      const result = await passwords.deleteOne({
        _id: new ObjectId(id),
        userId,
      });

      if (!result.deletedCount) {
        return res.status(404).json({
          error: "Not found",
        });
      }

      return res.json({ success: true });
    }

    /* ================= PUT ================= */
    if (req.method === "PUT") {
      const { site, username, password } = req.body;

      if (!site || !username || !password) {
        return res.status(400).json({
          error: "All fields required",
        });
      }

      const doc = await passwords.findOne({
        _id: new ObjectId(id),
        userId,
      });

      if (!doc) {
        return res.status(404).json({
          error: "Not found",
        });
      }

      await passwords.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            site,
            username,
            password,
            updatedAt: new Date(),
          },
        }
      );

      const updated = await passwords.findOne({
        _id: new ObjectId(id),
      });

      return res.json({
        success: true,
        result: updated,
      });
    }

    return res.status(405).end();

  } catch (err) {
    console.error("PASSWORDS ID ERROR:", err);

    return res.status(401).json({
      error: "Unauthorized",
    });
  }
}