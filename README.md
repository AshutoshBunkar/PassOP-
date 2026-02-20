#  PassOP — Password Manager 

A modern, secure, and responsive **Password Manager Web App** built using **React, Vercel Serverless Functions, and MongoDB Atlas**.

This project demonstrates a complete **Full-Stack architecture** with proper frontend–backend separation and cloud deployment.

---

##  Live Demo

 https://project-password-manager-eight.vercel.app/


---

##  Features

 Store website credentials securely  
 Copy username/password to clipboard  
 Show / Hide passwords  
 Responsive UI (Mobile + Desktop)  
 Read-Only Mode for Demo  
 Cloud Database (MongoDB Atlas)  
 Serverless Backend (Vercel)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Vercel Serverless Functions |
| Database | MongoDB Atlas |
| Hosting | Vercel |
| Version Control | Git + GitHub |

---

##  Project Architecture
This project follows a **serverless web application architecture** where the frontend and backend are deployed together on Vercel.


### Architecture Overview

#### 1️⃣ Frontend Layer
- Handles user interface and interactions
- Manages application state
- Implements Read-Only Mode for demo safety
- Communicates with backend using Fetch API

#### 2️⃣ Backend Layer (Serverless)
- Implemented using Vercel Serverless Functions
- Handles CRUD operations
- Validates incoming requests
- Protects database access
- Uses environment variables for security

#### 3️⃣ Database Layer
- Uses MongoDB Atlas for cloud storage
- Stores credential data securely
- Provides scalability and reliability

---

##  Environment Variables

Create `.env` and `.env.local` files in the project root:

```env
MONGO_URI=your_mongodb_connection_string
DB_NAME=your_database_name
READ_ONLY=true
```



##  Read-Only Mode

This project includes a Read-Only Mode for safe public demonstrations.

When enabled:

-  Add, Edit, and Delete actions are disabled
-  Database write operations are blocked
-  Users can only view stored data

Read-Only Mode is enforced at both frontend and backend levels.

### Enable

Set the following in `.env` and `.env.local`:

```env
READ_ONLY=true
