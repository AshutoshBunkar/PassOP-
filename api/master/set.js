import bcrypt from "bcryptjs";

import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";



export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
   const usr =  await verifyJwt(req, res);

    const { masterPassword } = req.body;

    if (!masterPassword) return res.status(400).json({ success: false });

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const auth0Id = usr.sub;

    const users = db.collection("Users");

    const user = await users.findOne({ auth0Id });

    if (user?.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Already set",
      });
    }

    const hash = await bcrypt.hash(masterPassword, 10);

    await users.updateOne(
      { auth0Id },
      {
        $set: {
          auth0Id,
          masterHash: hash,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}
