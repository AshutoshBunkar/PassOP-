# 🔐 PassOP — Secure Password Manager (Serverless)

PassOP is a modern, secure, and fully serverless **Password Manager Web Application** built using **React, Vercel Serverless Functions, Auth0, and MongoDB Atlas**.

It follows a **zero-knowledge-style encryption model**, where sensitive data is encrypted on the client side before being stored in the database.

This project demonstrates **real-world full-stack architecture, security practices, and cloud deployment**.

---

## 🌐 Live Demo

👉 https://project-password-manager-eight.vercel.app/

---

## ✨ Key Features

### 🔑 Authentication & Security
- Secure login using Auth0
- JWT-based API authentication
- Brute-force protection
- Account lockout system

### 🔒 Encryption System
- Client-side AES encryption
- PBKDF2 key derivation
- Per-user cryptographic salt
- Zero-knowledge inspired model

### 🗝️ Master Password System
- First-time setup
- Secure verification
- Change password with re-encryption
- Vault reset option

### 📦 Vault Management
- Add, edit, delete credentials
- Copy to clipboard
- Show / Hide passwords
- User-isolated vault

### ☁️ Cloud & Deployment
- Serverless backend
- MongoDB Atlas database
- Environment configs
- Production-ready setup

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Vercel Serverless Functions |
| Auth | Auth0 |
| Database | MongoDB Atlas |
| Crypto | CryptoJS, bcryptjs |
| JWT | jose |
| Hosting | Vercel |
| Version Control | Git & GitHub |

---

## 🏗️ Project Architecture

Frontend (React)
      ↓
Serverless APIs (Vercel)
      ↓
MongoDB Atlas

---

## 📁 Folder Structure

api/
├── master/
├── users/
├── passwords/
└── utils/

src/
├── components/
├── pages/
└── utils/

---

## 🔐 Security Model

- Master password never stored
- Client-side encryption
- Encrypted storage
- Per-user isolation
- JWT protected APIs

### Implemented Protections

- AES Encryption
- PBKDF2
- bcrypt
- JWT Verification
- Brute-force Prevention

---

## ⚙️ Environment Variables

Create `.env.local` file in root:

MONGO_URI=your_mongodb_uri
DB_NAME=your_database

AUTH0_DOMAIN=your_auth0_domain
AUTH0_AUDIENCE=your_auth0_audience

---

## 🧪 API Endpoints

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

## 🚀 Installation & Setup

### 1. Clone Repository

git clone https://github.com/your-username/passop.git
cd passop

### 2. Install Dependencies

npm install

### 3. Setup Environment

Configure `.env.local` file.

### 4. Run Locally

npm run dev

---

## 📈 Scalability

- CDN-based frontend
- Stateless APIs
- Managed database
- Cloud authentication

---

## ⚖️ Design Trade-offs

| Decision | Advantage | Limitation |
|----------|-----------|------------|
| Serverless | Auto scale | Cold starts |
| Client Encryption | High privacy | Complexity |
| Auth0 | Secure auth | Dependency |
| MongoDB | Flexible | NoSQL limits |

---

## 🏛️ System Design

### Authentication Flow

1. User logs in using Auth0
2. Auth0 issues JWT
3. Token attached to API
4. Server verifies token
5. Request processed

### Encryption Flow

1. User enters master password
2. PBKDF2 derives AES key
3. Data encrypted locally
4. Ciphertext sent to backend
5. Stored securely

### Data Isolation

All records scoped by:

{ userId: auth0Id }

---

## 👨‍💻 Author

Ashutosh  
Engineering Student | Full-Stack Developer

GitHub: https://github.com/your-username  
LinkedIn: https://linkedin.com/in/your-profile

---

## 📄 License

MIT License

---

## 🎯 Design Philosophy

- Security over convenience
- Privacy over performance
- Scalability over simplicity
- Clean code over shortcuts

Built with modern cloud-native best practices.
