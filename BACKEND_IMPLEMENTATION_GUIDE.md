# Hostel Laundry Operations System — Backend Architecture & Implementation Guide

> **Project Title**: Laundry Management System for Hostels  
> **Course**: Full Stack Development (FSD) Project  
> **Target Audience**: Backend Developer(s)  
> **Frontend Stack**: React 18, Vite, Swiss International Typographic Style (Inter, Terracotta `#A0442C`, Zero Emojis, Zero Blue)  
> **Backend Stack**: Node.js, Express.js, MongoDB (Mongoose), JWT, bcryptjs, cors, dotenv  

---

## 1. Executive Summary & Problem Context

In hostel environments, hundreds of students submit laundry weekly. The traditional paper/token workflow leads to lost garments, student anxiety over turnaround times, and staff bottlenecks. 

This system provides:
1. **Unique Wash ID & Scannable QR Codes**: Every laundry cycle has a deterministic identifier `<card_id>-<wash_number>` (e.g. Card ID `1077`, 2nd wash $\rightarrow$ `1077-2`, QR payload: `HL-1077-2`).
2. **7-Stage Workflow Progression**: Bags advance through distinct operational checkpoints:
   $$\text{Submitted} \rightarrow \text{Received} \rightarrow \text{Washing} \rightarrow \text{Drying} \rightarrow \text{Ironing/Folding} \rightarrow \text{Ready for Collection} \rightarrow \text{Collected}$$
3. **Live Hardware / Camera QR Scanner**: Staff uses a webcam or phone camera scanner to scan tags or phone screens, which instantly loads the bag and enables rapid stage advancement.
4. **Student Self-Service Portal**: Students can register/log in, submit laundry bags, track live status, check estimated return dates, view historic records, and receive collection notices.
5. **Academic Year Policy**: Fixed quota of **30 washes per academic year** (covering 2 semesters) per resident.
6. **Wing Identification**: Hostel wings strictly use numbers (e.g., `Wing 1`, `Wing 2`, `Wing 3`, `Wing 4`), not letters.

---

## 2. Recommended Backend Project Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection using Mongoose
├── controllers/
│   ├── authController.js     # Login, Register, Profile
│   ├── bagController.js      # CRUD, lookup, stage progression, submission
│   └── telemetryController.js# Queue load, traffic levels, turnaround estimation
├── middleware/
│   ├── auth.js               # JWT verification & role authorization (student/staff)
│   └── errorHandler.js       # Centralized error handler
├── models/
│   ├── User.js               # Student & Staff schema
│   └── LaundryBag.js         # Laundry bag tracking & stage history schema
├── routes/
│   ├── auth.js               # /api/auth routes
│   ├── bags.js               # /api/bags routes
│   └── telemetry.js          # /api/telemetry routes
├── .env.example              # Environment variables template
├── package.json
├── server.js                 # Application entry point
└── README.md
```

---

## 3. Database Schemas (MongoDB / Mongoose)

### 3.1. User Schema (`models/User.js`)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['student', 'staff'],
    required: true,
    default: 'student'
  },
  // Permanent Student Card ID (e.g. "1077") or Staff Employee ID (e.g. "EMP-9042")
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  cardId: {
    type: String,
    trim: true,
    sparse: true
  },
  usn: {
    type: String,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Strictly numeric wings: e.g. "Wing 2 - Room 302"
  room: {
    type: String,
    trim: true,
    default: 'Wing 2 - Room 302'
  },
  password: {
    type: String,
    required: true
  },
  annualWashQuota: {
    type: Number,
    default: 30
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
```

### 3.2. LaundryBag Schema (`models/LaundryBag.js`)

```javascript
const mongoose = require('mongoose');

const LAUNDRY_STAGES = [
  'Submitted',
  'Received',
  'Washing',
  'Drying',
  'Ironing/Folding',
  'Ready for Collection',
  'Collected'
];

const stageHistorySchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: LAUNDRY_STAGES,
    required: true
  },
  timestamp: {
    type: String,
    required: true // e.g. "Today, 09:30 AM" or formatted ISO
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const laundryBagSchema = new mongoose.Schema({
  // Unique Wash Identifier: <cardId>-<washNumber> (e.g. "1077-2")
  washId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  cardId: {
    type: String,
    required: true,
    trim: true
  },
  washNumber: {
    type: Number,
    required: true
  },
  qrCode: {
    type: String,
    required: true // e.g. "HL-1077-2"
  },
  usn: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    required: true,
    trim: true // e.g. "Wing 2 - Room 302"
  },
  stage: {
    type: String,
    enum: LAUNDRY_STAGES,
    default: 'Submitted',
    required: true
  },
  totalItems: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  itemBreakdown: {
    shirts: { type: Number, default: 0 },
    trousers: { type: Number, default: 0 },
    towels: { type: Number, default: 0 },
    bedding: { type: Number, default: 0 },
    jeans: { type: Number, default: 0 },
    clothes: { type: Number, default: 0 }
  },
  weightKg: {
    type: Number,
    default: 3.0
  },
  submittedAt: {
    type: String,
    required: true
  },
  expectedAt: {
    type: String,
    required: true
  },
  readyAt: {
    type: String
  },
  collectedAt: {
    type: String
  },
  pickupBin: {
    type: String,
    default: 'Wing 2 Service Counter (Bin 14)'
  },
  assignedStaff: {
    type: String,
    default: 'Intake Desk'
  },
  notes: {
    type: String,
    default: 'Standard residential fabric care'
  },
  stageHistory: [stageHistorySchema]
}, { timestamps: true });

module.exports = {
  LaundryBag: mongoose.model('LaundryBag', laundryBagSchema),
  LAUNDRY_STAGES
};
```

---

## 4. Business Logic & Calculation Rules

### 4.1. Wash ID & QR Code Generation Rule
When a bag is submitted for a student:
1. Count the number of prior bags in the database for `cardId` or `usn`.
2. Compute `washNumber = count + 1`.
3. Check `washNumber <= 30` (annual quota check).
4. `washId = "${cardId}-${washNumber}"` (e.g., `1077-2`).
5. `qrCode = "HL-${washId}"` (e.g., `HL-1077-2`).

### 4.2. Facility Traffic & Turnaround Estimation Rule
Traffic load is computed dynamically based on the number of active bags (`stage !== 'Collected'`):
- **1 to 3 Active Bags** $\rightarrow$ **Low Traffic** (`estimatedDays: '1-2 Days'`, class: `low`, color: `green`)
- **4 to 7 Active Bags** $\rightarrow$ **Medium Traffic** (`estimatedDays: '3-4 Days'`, class: `medium`, color: `amber`)
- **8+ Active Bags** $\rightarrow$ **High Traffic** (`estimatedDays: '4-5 Days'`, class: `high`, color: `red`)

Expected completion date calculation:
$$\text{Expected Date} = \text{Current Date} + \text{Turnaround Days}$$

### 4.3. Stage History Logging
Whenever `stage` changes:
- Append `{ stage: newStage, timestamp: nowString, note: customNote }` to `stageHistory`.
- If `newStage === 'Ready for Collection'`, assign `pickupBin = "Wing 2 Counter - Shelf " + random(10, 40)` and set `readyAt`.
- If `newStage === 'Collected'`, record `collectedAt`.

---

## 5. REST API Specifications

Base URL: `http://localhost:5000/api`

### 5.1. Authentication Routes

#### `POST /api/auth/register`
Creates a new student resident account.
- **Request Body**:
  ```json
  {
    "cardId": "1077",
    "usn": "ENG24CY0189",
    "name": "Alex Morgan",
    "room": "Wing 2 - Room 302",
    "password": "securepassword123"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "role": "student",
      "cardId": "1077",
      "usn": "ENG24CY0189",
      "name": "Alex Morgan",
      "room": "Wing 2 - Room 302"
    }
  }
  ```

#### `POST /api/auth/login`
Authenticates a student (using Card ID or USN) or staff operator (using Employee ID).
- **Request Body (Student)**:
  ```json
  {
    "role": "student",
    "identifier": "1077",
    "password": "securepassword123"
  }
  ```
- **Request Body (Staff)**:
  ```json
  {
    "role": "staff",
    "identifier": "EMP-9042",
    "password": "adminpassword"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "role": "student",
      "identifier": "1077",
      "cardId": "1077",
      "name": "Alex Morgan",
      "room": "Wing 2 - Room 302"
    }
  }
  ```

---

### 5.2. Laundry Bag Routes

#### `GET /api/bags`
Returns laundry bags list with optional filters.
- **Query Params**:
  - `stage`: e.g. `ALL_ACTIVE`, `Washing`, `Ready for Collection`
  - `cardId`: e.g. `1077` (returns student's active & previous bags)
  - `search`: search by student name, USN, or Wash ID
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "1077-2",
      "washId": "1077-2",
      "cardId": "1077",
      "washNumber": 2,
      "qrCode": "HL-1077-2",
      "usn": "ENG24CY0189",
      "studentName": "Alex Morgan",
      "room": "Wing 2 - Room 302",
      "stage": "Washing",
      "totalItems": 8,
      "weightKg": 3.8,
      "submittedAt": "Today, 09:30 AM",
      "expectedAt": "Today, 04:30 PM",
      "stageHistory": [
        { "stage": "Submitted", "timestamp": "Today, 09:30 AM", "note": "Intake submitted" },
        { "stage": "Received", "timestamp": "Today, 09:45 AM", "note": "Intake verified" },
        { "stage": "Washing", "timestamp": "Today, 10:15 AM", "note": "Cycle running" }
      ]
    }
  ]
  ```

#### `GET /api/bags/:id`
Hardware scanner & unique ID inquiry lookup.
> **Important**: This endpoint MUST match any of the following:
> 1. Exact `washId` (e.g. `1077-2`)
> 2. QR payload (e.g. `HL-1077-2`)
> 3. Permanent `cardId` (e.g. `1077` $\rightarrow$ returns active bag for that card)
> 4. MongoDB `_id`
- **Response (200 OK)**: Single `LaundryBag` JSON object.

#### `POST /api/bags`
Submits a new laundry bag (used by student portal and staff intake desk).
- **Request Body**:
  ```json
  {
    "cardId": "1077",
    "usn": "ENG24CY0189",
    "studentName": "Alex Morgan",
    "room": "Wing 2 - Room 302",
    "totalItems": 6,
    "notes": "Mild detergent requested"
  }
  ```
- **Response (201 Created)**: Newly created `LaundryBag` record.

#### `PATCH /api/bags/:id/stage`
Advances workflow stage (used by Staff Dashboard buttons and live QR camera scan controls).
- **Request Body**:
  ```json
  {
    "stage": "Drying",
    "note": "Advanced to Drying by staff operator"
  }
  ```
- **Response (200 OK)**: Updated `LaundryBag` record with new stage history entry.

---

### 5.3. Telemetry & Quota Routes

#### `GET /api/students/:identifier/quota`
Returns academic year wash allocation statistics.
- **Response (200 OK)**:
  ```json
  {
    "cardId": "1077",
    "usn": "ENG24CY0189",
    "studentName": "Alex Morgan",
    "room": "Wing 2 - Room 302",
    "totalAllowance": 30,
    "used": 2,
    "remaining": 28,
    "percentUsed": 6.7,
    "isQuotaExhausted": false
  }
  ```

#### `GET /api/telemetry/metrics`
Returns real-time facility metrics for staff KPI cards:
- **Response (200 OK)**:
  ```json
  {
    "totalActive": 5,
    "submitted": 1,
    "received": 0,
    "washing": 1,
    "drying": 1,
    "ironing": 1,
    "ready": 1,
    "collectedToday": 1
  }
  ```

#### `GET /api/telemetry/traffic`
Returns queue load and estimated turnaround:
- **Response (200 OK)**:
  ```json
  {
    "activeCount": 5,
    "trafficLevel": "Medium Traffic",
    "trafficClass": "medium",
    "trafficColor": "amber",
    "loadBars": 2,
    "estimatedDays": "3-4 Days",
    "targetDateFormatted": "27 Nov"
  }
  ```

---

## 6. How the Frontend Connects to the Backend

### 6.1. Current State
The frontend currently uses `frontend/src/utils/laundryStore.js`, which acts as a self-contained in-memory and `localStorage` mock store.

### 6.2. Seamless Transition to Real API
To switch the frontend to the backend REST API:
1. In `frontend/.env`, set:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
2. Replace or wrap the functions in `frontend/src/utils/laundryStore.js` with `fetch` calls to `http://localhost:5000/api`.
3. Enable CORS on the Express server:
   ```javascript
   const cors = require('cors');
   app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
   ```

---

## 7. Seed Data for Immediate Testing

The backend should include a seed script (`npm run seed`) with the pre-populated students and sample active bags:

### Pre-Registered Students:
1. **Alex Morgan**: Card ID `1077`, USN `ENG24CY0189`, Room `Wing 2 - Room 302`
2. **Priya Sharma**: Card ID `1042`, USN `ENG24CS0142`, Room `Wing 1 - Room 104`
3. **Rahul Verma**: Card ID `1088`, USN `ENG24EC0088`, Room `Wing 3 - Room 210`
4. **Karan Patel**: Card ID `1098`, USN `ENG24ME0098`, Room `Wing 2 - Room 108`
5. **Tanvi Deshmukh**: Card ID `1051`, USN `ENG24IT0051`, Room `Wing 1 - Room 308`

---

## 8. Development & Run Checklist

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install express mongoose dotenv cors bcryptjs jsonwebtoken
   npm install --save-dev nodemon
   ```
2. **Configure `.env`**:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/hostel_laundry
   JWT_SECRET=super_secret_hostel_key_2026
   ```
3. **Start MongoDB**: Ensure MongoDB service or Docker container is running locally on port 27017.
4. **Run Server**:
   ```bash
   npm run dev
   ```
5. **Verify Endpoints**:
   - `http://localhost:5000/api/telemetry/metrics` returns 200 OK.
   - Frontend running on `http://localhost:5173` connects without CORS errors.
