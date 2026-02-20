const connectDB = require("../_mongo");

module.exports = async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("passwords");

    if (req.method === "GET") {
      const data = await collection.find({}).toArray();
      return res.json({ success: true, result: data });
    }

    if (req.method === "POST") {
      if (process.env.READ_ONLY === "true") {
        return res.status(403).json({ message: "Read only mode" });
      }

      const password = req.body;

      if (!password) {
        return res.status(400).json({ success: false });
      }

      const result = await collection.insertOne(password);

      return res.json({ success: true, result });
    }

    res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("API CRASH ❌", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};