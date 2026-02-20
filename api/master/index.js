import bcrypt from "bcryptjs";
import connectDB from "../users/_mongo.js";
import User from "../users/User.js"; // adjust if path differs
import auth from "../users/auth.js"; // adjust if path differs

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { masterPassword, action } = req.body;

  try {
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false });
    }

    const user = await User.findOne({ auth0Id: userId });

    if (!user) {
      return res.status(404).json({ success: false });
    }

    // ---------------- SET MASTER ----------------
    if (action === "set") {
      const hash = await bcrypt.hash(masterPassword, 10);

      user.masterHash = hash;
      await user.save();

      return res.json({ success: true });
    }

    // ---------------- VERIFY MASTER ----------------
    if (action === "verify") {
      if (!user.masterHash) {
        return res.status(400).json({
          success: false,
          message: "Master not set",
        });
      }

      const ok = await bcrypt.compare(
        masterPassword,
        user.masterHash
      );

      if (!ok) {
        return res.status(401).json({ success: false });
      }

      return res.json({ success: true });
    }

    return res.status(400).json({ success: false });

  } catch (err) {
    console.error("Master API error:", err);
    res.status(500).json({ success: false });
  }
}