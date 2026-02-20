import clientPromise from "../utils/_mongo.js";
import { verifyJwt } from "../utils/verifyJwt.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const user = await verifyJwt(req);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME);

    const auth0Id = user.sub;

    const userDoc = await db
      .collection("Users")
      .findOne({ auth0Id });

    res.json({ exists: !!userDoc?.masterHash });

  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Unauthorized" });
  }
}