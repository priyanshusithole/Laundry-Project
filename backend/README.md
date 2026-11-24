# Hostel Laundry Operations System — Backend API

This is the backend service for the **Laundry Management System for Hostels** (Full Stack Development Project).

Built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**.

---

## Quick Start Guide

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` values:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/hostel_laundry
JWT_SECRET=hostel_laundry_jwt_secret_key_2026
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Ensure MongoDB is Running
Start your local MongoDB service or Docker container:
```bash
# If using Docker:
docker run -d -p 27017:27017 --name mongo-fsd mongo:latest
```

### 4. Seed Initial Data
Pre-populates sample students (Card IDs 1077, 1042, 1088, etc.), staff, and active laundry bags:
```bash
npm run seed
```

### 5. Run the Server
```bash
npm run dev
```
The API will run at `http://localhost:5000/api`.

---

## Key Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new student resident account |
| `POST` | `/api/auth/login` | Authenticate student or staff |
| `GET` | `/api/bags` | List bags (supports `?stage=...`, `?cardId=...`, `?search=...`) |
| `GET` | `/api/bags/:id` | Fetch bag by Wash ID (e.g. `1077-2`), QR code (`HL-1077-2`), or Card ID |
| `POST` | `/api/bags` | Submit new laundry bag (student or intake counter) |
| `PATCH` | `/api/bags/:id/stage` | Advance stage in 7-stage workflow |
| `GET` | `/api/telemetry/metrics` | Real-time active counts for staff KPI metrics |
| `GET` | `/api/telemetry/traffic` | Queue traffic status and turnaround estimate |

For comprehensive schema definitions, workflow progression rules, and integration details, please refer to:
`../BACKEND_IMPLEMENTATION_GUIDE.md`
