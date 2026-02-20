import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const user = await verifyJwt(req);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const auth0Id = user.sub;

    await db
      .collection("Passwords")
      .deleteMany({ userId: auth0Id });

    await db.collection("Users").updateOne(
      { auth0Id },
      {
        $unset: { masterHash: "" },
        $set: {
          failedAttempts: 0,
          lockUntil: null,
        },
      }
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}