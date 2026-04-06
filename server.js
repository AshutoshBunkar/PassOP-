require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const CryptoJS = require("crypto-js");

// ─── JWT verify (same logic as api/utils/verifyJwt.js) ───
async function verifyJwt(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }

  const token = authHeader.split(" ")[1];

  // Dynamic import for ESM-only jose package
  const { createRemoteJWKSet, jwtVerify } = await import("jose");

  const JWKS = createRemoteJWKSet(
    new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
  );

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    audience: process.env.AUTH0_AUDIENCE,
  });

  return payload;
}

// ─── Crypto helpers (same logic as api/utils/crypto.js) ───
const deriveKey = (password, salt) => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  }).toString();
};

const encryptPassword = (text, key) => {
  return CryptoJS.AES.encrypt(text, key).toString();
};

const decryptPassword = (cipher, key) => {
  const bytes = CryptoJS.AES.decrypt(cipher, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ─── MongoDB connection ───
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

async function connectDB() {
  await client.connect();
  db = client.db(process.env.DB_NAME);
  console.log("✅ Connected to MongoDB");
}

// ─── Express app ───
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────────────────
//  USERS  (mirrors api/users/index.js)
// ──────────────────────────────────────────────────────────
app.get("/api/users", async (req, res) => {
  try {
    const user = await verifyJwt(req);

    const auth0Id = user.sub;
    const users = db.collection("Users");

    let userDoc = await users.findOne({ auth0Id });

    if (!userDoc) {
      const salt = crypto.randomBytes(16).toString("hex");

      const newUser = {
        auth0Id,
        salt,
        createdAt: new Date(),
        failedAttempts: 0,
        lockUntil: null,
      };

      await users.insertOne(newUser);
      userDoc = newUser;

      console.log("🆕 New user created");
    }

    return res.status(200).json({ salt: userDoc.salt });
  } catch (err) {
    console.error("USERS ERROR:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

// ──────────────────────────────────────────────────────────
//  PASSWORDS  (mirrors api/passwords/index.js)
// ──────────────────────────────────────────────────────────
app.get("/api/passwords", async (req, res) => {
  try {
    const user = await verifyJwt(req);
    const userId = user.sub;
    const passwords = db.collection("Passwords");

    const data = await passwords
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({ success: true, result: data });
  } catch (err) {
    console.error("PASSWORDS INDEX ERROR:", err);
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
});

app.post("/api/passwords", async (req, res) => {
  try {
    const user = await verifyJwt(req);
    const userId = user.sub;
    const passwords = db.collection("Passwords");

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
      result: { ...newPass, _id: result.insertedId },
    });
  } catch (err) {
    console.error("PASSWORDS POST ERROR:", err);
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
});

// ──────────────────────────────────────────────────────────
//  PASSWORDS/:id  (mirrors api/passwords/[id].js)
// ──────────────────────────────────────────────────────────
app.delete("/api/passwords/:id", async (req, res) => {
  try {
    const user = await verifyJwt(req);
    const userId = user.sub;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const passwords = db.collection("Passwords");

    const result = await passwords.deleteOne({
      _id: new ObjectId(id),
      userId,
    });

    if (!result.deletedCount) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("PASSWORDS ID ERROR:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

app.put("/api/passwords/:id", async (req, res) => {
  try {
    const user = await verifyJwt(req);
    const userId = user.sub;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { site, username, password } = req.body;

    if (!site || !username || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const passwords = db.collection("Passwords");

    const doc = await passwords.findOne({
      _id: new ObjectId(id),
      userId,
    });

    if (!doc) {
      return res.status(404).json({ error: "Not found" });
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

    return res.json({ success: true, result: updated });
  } catch (err) {
    console.error("PASSWORDS ID ERROR:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

// ──────────────────────────────────────────────────────────
//  MASTER / STATUS  (mirrors api/master/status.js)
// ──────────────────────────────────────────────────────────
app.get("/api/master/status", async (req, res) => {
  try {
    const user = await verifyJwt(req);
    const auth0Id = user.sub;

    const userDoc = await db
      .collection("Users")
      .findOne({ auth0Id });

    res.json({ exists: !!userDoc?.masterHash });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

// ──────────────────────────────────────────────────────────
//  MASTER / SET  (mirrors api/master/set.js)
// ──────────────────────────────────────────────────────────
app.post("/api/master/set", async (req, res) => {
  try {
    const usr = await verifyJwt(req);

    const { masterPassword } = req.body;

    if (!masterPassword) return res.status(400).json({ success: false });

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
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ──────────────────────────────────────────────────────────
//  MASTER / VERIFY  (mirrors api/master/verify.js)
// ──────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 min

app.post("/api/master/verify", async (req, res) => {
  try {
    const payload = await verifyJwt(req);
    const auth0Id = payload.sub;

    const { masterPassword } = req.body;

    if (!masterPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing password",
      });
    }

    const users = db.collection("Users");
    const user = await users.findOne({ auth0Id });

    if (!user || !user.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    /* 🔒 Check lock */
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMs = user.lockUntil - Date.now();
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);

      return res.status(403).json({
        success: false,
        locked: true,
        message: "Account locked",
        minutes,
        seconds,
      });
    }

    /* 🔑 Verify */
    const ok = await bcrypt.compare(masterPassword, user.masterHash);

    /* ❌ Wrong password */
    if (!ok) {
      const attempts = (user.failedAttempts || 0) + 1;
      const remaining = MAX_ATTEMPTS - attempts;

      /* 🚫 Lock */
      if (attempts >= MAX_ATTEMPTS) {
        await users.updateOne(
          { auth0Id },
          {
            $set: {
              lockUntil: Date.now() + LOCK_TIME,
              failedAttempts: 0,
            },
          }
        );

        return res.status(403).json({
          success: false,
          locked: true,
          message: "Account locked for 15 minutes",
          remaining: 0,
        });
      }

      /* ⏳ Save attempts */
      await users.updateOne(
        { auth0Id },
        { $set: { failedAttempts: attempts } }
      );

      return res.status(401).json({
        success: false,
        locked: false,
        remaining,
        message: `Invalid password. ${remaining} attempts left.`,
      });
    }

    /* ✅ Success → reset */
    await users.updateOne(
      { auth0Id },
      {
        $set: {
          failedAttempts: 0,
          lockUntil: null,
        },
      }
    );

    return res.json({ success: true, message: "Verified" });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ──────────────────────────────────────────────────────────
//  MASTER / CHANGE  (mirrors api/master/change.js)
// ──────────────────────────────────────────────────────────
app.post("/api/master/change", async (req, res) => {
  try {
    const payload = await verifyJwt(req);

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false });
    }

    const auth0Id = payload.sub;
    const users = db.collection("Users");
    const passwords = db.collection("Passwords");

    const userDoc = await users.findOne({ auth0Id });

    if (!userDoc || !userDoc.masterHash) {
      return res.status(400).json({
        success: false,
        message: "Master not set",
      });
    }

    /* 🔐 Verify old master */
    const ok = await bcrypt.compare(oldPassword, userDoc.masterHash);

    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Old password incorrect",
      });
    }

    /* 🔑 Re-encrypt vault */
    const oldKey = deriveKey(oldPassword, userDoc.salt);
    const newKey = deriveKey(newPassword, userDoc.salt);

    const vault = await passwords
      .find({ userId: auth0Id })
      .toArray();

    for (const item of vault) {
      const dec = decryptPassword(item.password, oldKey);
      const enc = encryptPassword(dec, newKey);

      await passwords.updateOne(
        { _id: item._id },
        {
          $set: {
            password: enc,
            updatedAt: new Date(),
          },
        }
      );
    }

    /* 🔒 Update hash */
    const hash = await bcrypt.hash(newPassword, 10);

    await users.updateOne(
      { auth0Id },
      {
        $set: {
          masterHash: hash,
          updatedAt: new Date(),
        },
      }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("CHANGE MASTER ERROR:", err);
    return res.status(500).json({ success: false });
  }
});

// ──────────────────────────────────────────────────────────
//  MASTER / RESET  (mirrors api/master/reset.js)
// ──────────────────────────────────────────────────────────
app.post("/api/master/reset", async (req, res) => {
  try {
    const user = await verifyJwt(req);
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
});

// ──────────────────────────────────────────────────────────
//  STATIC FILES (production)
// ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// Fallback → serve React app for any non-API route
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ──────────────────────────────────────────────────────────
//  START
// ──────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
