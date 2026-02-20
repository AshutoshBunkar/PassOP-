const connectDB = require("../_mongo");

module.exports = async (req, res) => {
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    if (process.env.READ_ONLY === "true") {
      return res.status(403).json({ message: "Read only mode" });
    }

    const { id } = req.query;

    const db = await connectDB();
    const collection = db.collection("passwords");

    const result = await collection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("DELETE ERROR ❌", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};