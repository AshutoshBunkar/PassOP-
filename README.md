#  PassOP — Secure Password Manager

PassOP is a modern, secure **Password Manager Web Application** built using **React, Express.js, Auth0, and MongoDB Atlas**.

It follows a **zero-knowledge-style encryption model**, where sensitive data is encrypted on the client side before being stored in the database.

---

##  Key Features

###  Authentication & Security
- Secure login using Auth0
- JWT-based API authentication
- Brute-force protection
- Account lockout system

###  Encryption System
- Client-side AES encryption
- PBKDF2 key derivation
- Per-user cryptographic salt
- Zero-knowledge inspired model

###  Master Password System
- First-time setup
- Secure verification
- Change password with re-encryption
- Vault reset option

###  Vault Management
- Add, edit, delete credentials
- Copy to clipboard
- Show / Hide passwords
- User-isolated vault

---

##  Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Express.js (Node.js) |
| Auth | Auth0 |
| Database | MongoDB Atlas |
| Crypto | CryptoJS, bcryptjs |
| JWT | jose |
| Version Control | Git & GitHub |

---

##  Project Architecture

```
Frontend (React + Vite)
       ↓
Express.js Server (API)
       ↓
MongoDB Atlas
```

---

##  Folder Structure

```
├── server.js          # Express backend (all API routes)
├── src/
│   ├── components/    # React components
│   ├── pages/         # React pages
│   └── utils/         # Client-side crypto
├── public/            # Static assets & icons
├── index.html         # Vite entry
├── vite.config.js     # Vite config (with dev proxy)
├── package.json
└── .env               # Environment variables
```

---

##  Environment Variables

Create a `.env` file in root:

```env
MONGO_URI=your_mongodb_uri
DB_NAME=your_database

AUTH0_DOMAIN=your_auth0_domain
AUTH0_AUDIENCE=your_auth0_audience

VITE_AUTH0_DOMAIN=your_auth0_domain
VITE_AUTH0_CLIENT_ID=your_auth0_client_id
VITE_AUTH0_AUDIENCE=your_auth0_audience
```

---

##  Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/AshutoshBunkar/PassOP-.git
cd PassOP-
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

Create `.env` file with the variables listed above.

### 4. Run in Development

Open **two terminals**:

```bash
# Terminal 1 — Backend
node server.js

# Terminal 2 — Frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to the Express server on port `3000`.

### 5. Run in Production

```bash
# Build frontend
npm run build

# Start server (serves both API + frontend)
node server.js
```

Visit `http://localhost:3000`

---

##  API Endpoints

### Master Password

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/master/status | Status |
| POST | /api/master/set | Set |
| POST | /api/master/verify | Verify |
| POST | /api/master/change | Change |
| POST | /api/master/reset | Reset |

### Users

| Method | Endpoint |
|--------|----------|
| GET | /api/users |

### Passwords

| Method | Endpoint |
|--------|----------|
| GET | /api/passwords |
| POST | /api/passwords |
| PUT | /api/passwords/:id |
| DELETE | /api/passwords/:id |

---

##  Security Model

- Master password never stored (only bcrypt hash)
- Client-side AES encryption before sending to server
- Per-user PBKDF2 key derivation
- Per-user isolation via Auth0 `sub` claim
- JWT protected APIs
- Brute-force prevention with account lockout

---

##  Author

Ashutosh  
Engineering Student | Full-Stack Developer

GitHub: https://github.com/AshutoshBunkar

---

##  License

MIT License
