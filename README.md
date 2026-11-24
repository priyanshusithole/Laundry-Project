# Hostel Laundry Operations System (FSD Project)

An automated, end-to-end web application developed to modernize hostel laundry workflows. Designed for hostel residents and laundry operations staff, featuring live hardware/webcam QR code scanning, dynamic workflow stage progression, real-time workload telemetry, and academic year quota tracking.

---

## Team & Roles

| Name | USN | Roll No. | Project Role |
| :--- | :--- | :--- | :--- |
| **Priyanshu Sithole** | `ENG24CY0189` | 31 | Frontend Development |
| **Aarit Haldar** | `ENG24CY0073` | 45 | Backend Development |
| **Mohd Sahil Ansari** | `ENG24CY0134` | 22 | Admin Panel and Testing |
| **M.B Chiranth** | `ENG25CY1010` | 67 | Database and QR Management |

---

## Key Features

### For Hostel Students:
- **Authentication**: Secure registration and login using Permanent Student Card ID or USN.
- **Laundry Bag Submission**: Submit laundry bags online with item counts and custom fabric care notes.
- **Unique Digital Wash QR Pass**: Auto-generated scannable QR pass for each laundry cycle with download and screenshot capability.
- **Real-Time 7-Stage Tracking**:
  $$\text{Submitted} \rightarrow \text{Received} \rightarrow \text{Washing} \rightarrow \text{Drying} \rightarrow \text{Ironing/Folding} \rightarrow \text{Ready for Collection} \rightarrow \text{Collected}$$
- **Turnaround & Traffic Estimation**: Real-time delivery date estimates based on live facility load (Low / Medium / High Traffic).
- **Collection Ready Alerts**: Instant pickup notification showing the assigned counter shelf/bin (e.g., `Wing 2 Service Counter`).
- **Quota Tracking**: Real-time counter of the 30 annual washes allocated per academic year.
- **Historical Records**: Comprehensive timeline history of all completed and past laundry transactions.

### For Laundry Operations Staff:
- **Live Webcam QR Scanner**: Integrated camera scanner (`html5-qrcode`) that scans student phone screens or printed tags in real time with audio chimes.
- **Status Controller**: Advance workflow stages with a single click, dispatch bags to counter shelves, or set custom operational notes.
- **Facility Telemetry Metrics**: Live KPI counters displaying active bags across all operational stages.
- **Intake Desk Registration**: Manual drop-off intake modal with auto-fill student lookup.
- **Official Wash Tag Generator**: Generates and prints official physical barcode tags with student and wash metadata.
- **Bag Unique ID Inquiry**: Instant lookup by Wash ID (`1077-2`), QR code payload, or Card ID.

---

## Design System & Theme

The user interface is built strictly in accordance with the **Swiss / International Typographic Style**:
- **Typography**: Clean, objective Inter sans-serif font scale with tabular numerals.
- **Colors**: Neutral greys (`#FFFFFF`, `#FAFAFA`), architectural charcoal text (`#1C1917`), subtle borders (`#E5E7EB`), and deliberate terracotta accent (`#A0442C`).
- **Design Principles**: Zero emojis, zero shades of blue, disciplined asymmetric grid, and functional whitespace.

---

## Repository Structure

```
.
├── backend/                              # Express & Node.js Backend API
│   ├── models/                           # Mongoose schemas (User, LaundryBag)
│   ├── routes/                           # API endpoints (/auth, /bags, /telemetry)
│   ├── seed.js                           # Database seeder with sample students & bags
│   ├── server.js                         # Application entry point with CORS
│   ├── package.json
│   └── README.md                         # Backend specific guide
│
├── frontend/                             # React + Vite Frontend Application
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── components/                   # StudentDashboard, StaffDashboard
│   │   ├── utils/                        # laundryStore.js, audio.js
│   │   ├── App.jsx                       # Main application & routing
│   │   ├── App.css                       # Swiss typographic stylesheet
│   │   └── main.jsx                      # Vite React entry
│   └── package.json
│
├── BACKEND_IMPLEMENTATION_GUIDE.md       # Comprehensive API contract & architecture spec
├── FULL STACK DEVELOPMENT PROJECT.pdf    # Original project proposal document
└── Swiss_International_Typographic_Style_General_Design_Guide.docx # Design system guide
```

---

## Getting Started

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start at **`http://localhost:5173`**.

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run seed     # Seeds initial students & bags into MongoDB
npm run dev      # Runs API server at http://localhost:5000/api
```

---

## Technology Stack

- **Frontend**: React 18, Vite, CSS3 (Swiss Typographic System), `qrcode`, `html5-qrcode`
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JWT, bcryptjs, cors
- **Tools**: Git, GitHub, VS Code
