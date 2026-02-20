import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { auth } from "express-oauth2-jwt-bearer";
import bcrypt from "bcryptjs";
import {
  deriveKey,
  encryptPassword,
  decryptPassword,
} from "./api/utils/crypto.js";

dotenv.config();

const app = express();
const PORT = 3000;

/* ===================== MIDDLEWARE ===================== */

app.use(cors());
app.use(express.json());

// Allow OPTIONS preflight
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ===================== AUTH0 ===================== */

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
});

/* ===================== MONGODB ===================== */

let db;

async function connectDB() {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    db = client.db(process.env.DB_NAME);

    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
}

/* ===================== MASTER PASSWORD ===================== */

// Check if master exists
app.get("/api/master/status", checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");

    const user = await users.findOne({ auth0Id });

    res.json({
      exists: !!user?.masterHash,
    });
  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// Set master password (first time only)
app.post("/api/master/set", checkJwt, async (req, res) => {
  try {
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ success: false });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");

    const user = await users.findOne({ auth0Id });

    // Block overwrite
    if (user?.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master already set",
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
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (err) {
    console.error("SET MASTER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// Verify master password
app.post("/api/master/verify", checkJwt, async (req, res) => {
  try {
    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({ success: false });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");

    const user = await users.findOne({ auth0Id });

    if (!user || !user.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    const MAX_ATTEMPTS = 3;
    const LOCK_TIME = 60 * 1000; // 15 min

    /* 🔒 CHECK LOCK */
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMs = user.lockUntil - Date.now();

      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);

      return res.status(403).json({
        success: false,
        locked: true,
        message: `Account locked.`,
        minutes,
        seconds,
      });
    }

    /* 🔑 VERIFY */
    const ok = await bcrypt.compare(masterPassword, user.masterHash);

    /* ❌ WRONG */
    if (!ok) {
      const attempts = (user.failedAttempts || 0) + 1;
      const remaining = MAX_ATTEMPTS - attempts;

      // Lock if limit reached
      if (attempts >= MAX_ATTEMPTS) {
        await users.updateOne(
          { auth0Id },
          {
            $set: {
              lockUntil: Date.now() + LOCK_TIME,
              failedAttempts: 0,
            },
          },
        );

        return res.status(403).json({
          success: false,
          locked: true,
          message: "Account locked for 15 minutes",
          remaining: 0,
        });
      }

      // Still attempts left
      await users.updateOne(
        { auth0Id },
        {
          $set: {
            failedAttempts: attempts,
          },
        },
      );

      return res.status(401).json({
        success: false,
        locked: false,
        message: `Invalid password. ${remaining} attempts left.`,
        remaining,
      });
    }

    /* ✅ SUCCESS → RESET */
    await users.updateOne(
      { auth0Id },
      {
        $set: {
          failedAttempts: 0,
          lockUntil: null,
        },
      },
    );

    res.json({
      success: true,
      message: "Verified",
    });
  } catch (err) {
    console.error("VERIFY MASTER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ===================== RESET EVERYTHING ===================== */
app.post("/api/master/reset", checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");
    const passwords = db.collection("Passwords");

    const result = await passwords.deleteMany({ userId: auth0Id });
    console.log("Deleted vault items:", result.deletedCount);

    /* 🧨 Delete vault */
    // await passwords.deleteMany({ auth0Id });

    /* 🔄 Remove master */
    await users.updateOne(
      { auth0Id },
      {
        $unset: { masterHash: "" },
        $set: {
          failedAttempts: 0,
          lockUntil: null,
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      message: "Vault reset. All data deleted.",
    });
  } catch (err) {
    console.error("RESET ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ===================== USERS ===================== */

// Get user salt
app.get("/api/users", checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");

    let user = await users.findOne({ auth0Id });

    // Create user if new
    if (!user) {
      const crypto = await import("crypto");

      const salt = crypto.randomBytes(16).toString("hex");

      const newUser = {
        auth0Id,
        salt,
        createdAt: new Date(),

        failedAttempts: 0,
        lockUntil: null,
      };

      await users.insertOne(newUser);

      user = newUser;

      console.log("🆕 New user created");
    }

    res.json({ salt: user.salt });
  } catch (err) {
    console.error("USER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ===================== CHANGE MASTER PASSWORD ===================== */
app.post("/api/master/change", checkJwt, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");
    const passwords = db.collection("passwords");

    const user = await users.findOne({ auth0Id });

    if (!user || !user.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    /* 🔐 Verify old master */
    const ok = await bcrypt.compare(oldPassword, user.masterHash);

    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Old password incorrect",
      });
    }

    const salt = user.salt;

    /* 🔑 Keys */
    const oldKey = deriveKey(oldPassword, salt);
    const newKey = deriveKey(newPassword, salt);

    /* 📦 All vault items */
    const vault = await passwords.find({ auth0Id }).toArray();

    /* 🔁 Re-encrypt */
    for (const item of vault) {
      const decrypted = decryptPassword(item.password, oldKey);

      if (!decrypted) {
        return res.status(500).json({
          success: false,
          message: "Decryption failed",
        });
      }

      const reEncrypted = encryptPassword(decrypted, newKey);

      await passwords.updateOne(
        { _id: item._id },
        {
          $set: {
            password: reEncrypted,
            updatedAt: new Date(),
          },
        },
      );
    }

    /* 🔒 Update hash */
    const newHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { auth0Id },
      {
        $set: {
          masterHash: newHash,
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      message: "Master password updated",
    });
  } catch (err) {
    console.error("CHANGE MASTER ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ===================== RESET MASTER PASSWORD ===================== */
app.post("/api/master/change", checkJwt, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const auth0Id = req.auth.payload.sub;

    const users = db.collection("Users");
    const passwords = db.collection("passwords");

    const user = await users.findOne({ auth0Id });

    if (!user || !user.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    /* 🔐 Verify old password */
    const ok = await bcrypt.compare(oldPassword, user.masterHash);

    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Old password incorrect",
      });
    }

    /* 🔑 Get user salt */
    const salt = user.salt;

    /* 📦 Get all passwords */
    const vault = await passwords.find({ auth0Id }).toArray();

    /* 🔁 Re-encrypt all */
    const { deriveKey, encrypt, decrypt } = await import("./utils/crypto.js");

    const oldKey = deriveKey(oldPassword, salt);
    const newKey = deriveKey(newPassword, salt);

    for (const item of vault) {
      const decrypted = decrypt(item.password, oldKey);

      const reEncrypted = encrypt(decrypted, newKey);

      await passwords.updateOne(
        { _id: item._id },
        {
          $set: {
            password: reEncrypted,
            updatedAt: new Date(),
          },
        },
      );
    }

    /* 🔒 Update master hash */
    const newHash = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { auth0Id },
      {
        $set: {
          masterHash: newHash,
          updatedAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      message: "Master password updated",
    });
  } catch (err) {
    console.error("CHANGE MASTER ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ===================== PASSWORDS ===================== */

// Get passwords
app.get("/api/passwords", checkJwt, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const userId = req.auth.payload.sub;

    const data = await db.collection("Passwords").find({ userId }).toArray();

    res.json({ success: true, result: data });
  } catch (err) {
    console.error("GET PASSWORDS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add password
app.post("/api/passwords", checkJwt, async (req, res) => {
  try {
    const { site, username, password } = req.body;

    if (!site || !username || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const userId = req.auth.payload.sub;

    const newPassword = {
      site,
      username,
      password,
      userId,
      createdAt: new Date(),
    };

    const result = await db.collection("Passwords").insertOne(newPassword);

    res.json({
      success: true,
      result: { ...newPassword, _id: result.insertedId },
    });
  } catch (err) {
    console.error("ADD PASSWORD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete password
app.delete("/api/passwords/:id", checkJwt, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const result = await db.collection("Passwords").deleteOne({
      _id: new ObjectId(id),
      userId: req.auth.payload.sub,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update password
app.put("/api/passwords/:id", checkJwt, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    if (!db) {
      return res.status(500).json({ error: "DB not ready" });
    }

    const { site, username, password } = req.body;

    const doc = await db.collection("Passwords").findOne({
      _id: new ObjectId(id),
    });

    if (!doc) {
      return res.status(404).json({ error: "Not found" });
    }

    if (doc.userId !== req.auth.payload.sub) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.collection("Passwords").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          site,
          username,
          password,
        },
      },
    );

    const updated = await db.collection("Passwords").findOne({
      _id: new ObjectId(id),
    });

    res.json({ result: updated });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===================== SERVER ===================== */

async function startServer() {
  await connectDB();

  if (!db) {
    console.log("❌ DB not connected. Server not started.");
    return;
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

startServer();
