const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { LaundryBag } = require('./models/LaundryBag');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel_laundry';

const SEED_STUDENTS = [
  { cardId: '1077', usn: 'ENG24CY0189', name: 'Alex Morgan', room: 'Wing 2 - Room 302' },
  { cardId: '1042', usn: 'ENG24CS0142', name: 'Priya Sharma', room: 'Wing 1 - Room 104' },
  { cardId: '1088', usn: 'ENG24EC0088', name: 'Rahul Verma', room: 'Wing 3 - Room 210' },
  { cardId: '1098', usn: 'ENG24ME0098', name: 'Karan Patel', room: 'Wing 2 - Room 108' },
  { cardId: '1051', usn: 'ENG24IT0051', name: 'Tanvi Deshmukh', room: 'Wing 1 - Room 308' }
];

const SEED_STAFF = [
  { identifier: '1', name: 'Marcus Vance', role: 'staff' },
  { identifier: 'EMP-9042', name: 'Marcus Vance', role: 'staff' }
];

const SEED_BAGS = [
  {
    washId: '1077-2',
    cardId: '1077',
    washNumber: 2,
    qrCode: 'HL-1077-2',
    usn: 'ENG24CY0189',
    studentName: 'Alex Morgan',
    room: 'Wing 2 - Room 302',
    stage: 'Washing',
    totalItems: 8,
    weightKg: 3.8,
    submittedAt: 'Today, 09:30 AM',
    expectedAt: 'Today, 04:30 PM',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'Standard eco-wash, mild detergent requested',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 09:30 AM', note: 'Dropped off by resident (Card ID 1077)' },
      { stage: 'Received', timestamp: 'Today, 09:45 AM', note: 'Barcoded as Wash ID 1077-2 by intake staff' },
      { stage: 'Washing', timestamp: 'Today, 10:15 AM', note: 'Loaded into Commercial Washer #4' }
    ]
  },
  {
    washId: '1042-1',
    cardId: '1042',
    washNumber: 1,
    qrCode: 'HL-1042-1',
    usn: 'ENG24CS0142',
    studentName: 'Priya Sharma',
    room: 'Wing 1 - Room 104',
    stage: 'Ironing/Folding',
    totalItems: 6,
    weightKg: 2.4,
    submittedAt: 'Today, 08:15 AM',
    expectedAt: 'Today, 02:30 PM',
    assignedStaff: 'Elena Rostova (EMP-9045)',
    notes: 'Steam press for formal shirts',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 08:15 AM', note: 'Intake scanned (Card ID 1042)' },
      { stage: 'Received', timestamp: 'Today, 08:30 AM', note: 'Sorted by staff' },
      { stage: 'Washing', timestamp: 'Today, 09:00 AM', note: 'Wash cycle completed' },
      { stage: 'Drying', timestamp: 'Today, 10:30 AM', note: 'Dryer cycle completed' },
      { stage: 'Ironing/Folding', timestamp: 'Today, 11:45 AM', note: 'Ironing and folding underway' }
    ]
  },
  {
    washId: '1088-1',
    cardId: '1088',
    washNumber: 1,
    qrCode: 'HL-1088-1',
    usn: 'ENG24EC0088',
    studentName: 'Rahul Verma',
    room: 'Wing 3 - Room 210',
    stage: 'Ready for Collection',
    totalItems: 10,
    weightKg: 4.5,
    submittedAt: 'Yesterday, 03:00 PM',
    expectedAt: 'Today, 11:30 AM',
    readyAt: 'Today, 11:15 AM',
    pickupBin: 'Counter Bay 14 (Wing 2 Desk)',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'Packaged in clean recycled poly-bag',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Yesterday, 03:00 PM', note: 'Intake deposit logged (Card ID 1088)' },
      { stage: 'Received', timestamp: 'Yesterday, 03:30 PM', note: 'Staff verified' },
      { stage: 'Washing', timestamp: 'Yesterday, 04:30 PM', note: 'Wash cycle completed' },
      { stage: 'Drying', timestamp: 'Yesterday, 06:00 PM', note: 'Dryer cycle completed' },
      { stage: 'Ironing/Folding', timestamp: 'Today, 09:30 AM', note: 'Folded & tagged' },
      { stage: 'Ready for Collection', timestamp: 'Today, 11:15 AM', note: 'Placed in Counter Bay 14' }
    ]
  },
  {
    washId: '1098-1',
    cardId: '1098',
    washNumber: 1,
    qrCode: 'HL-1098-1',
    usn: 'ENG24ME0098',
    studentName: 'Karan Patel',
    room: 'Wing 2 - Room 108',
    stage: 'Drying',
    totalItems: 7,
    weightKg: 3.2,
    submittedAt: 'Today, 10:00 AM',
    expectedAt: 'Today, 05:00 PM',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'Standard wash & dry',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 10:00 AM', note: 'Deposit logged (Card ID 1098)' },
      { stage: 'Received', timestamp: 'Today, 10:20 AM', note: 'Intake verified' },
      { stage: 'Washing', timestamp: 'Today, 10:50 AM', note: 'Cycle completed' },
      { stage: 'Drying', timestamp: 'Today, 11:55 AM', note: 'Dryer cycle running' }
    ]
  },
  {
    washId: '1051-1',
    cardId: '1051',
    washNumber: 1,
    qrCode: 'HL-1051-1',
    usn: 'ENG24IT0051',
    studentName: 'Tanvi Deshmukh',
    room: 'Wing 1 - Room 308',
    stage: 'Submitted',
    totalItems: 5,
    weightKg: 2.1,
    submittedAt: 'Today, 11:30 AM',
    expectedAt: 'Tomorrow, 10:00 AM',
    assignedStaff: 'Unassigned',
    notes: 'Awaiting intake verification',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 11:30 AM', note: 'Bag intake registered (Card ID 1051)' }
    ]
  },
  {
    washId: '1077-1',
    cardId: '1077',
    washNumber: 1,
    qrCode: 'HL-1077-1',
    usn: 'ENG24CY0189',
    studentName: 'Alex Morgan',
    room: 'Wing 2 - Room 302',
    stage: 'Collected',
    totalItems: 9,
    weightKg: 4.1,
    submittedAt: '03 Nov 2026, 09:15 AM',
    expectedAt: '03 Nov 2026, 04:30 PM',
    readyAt: '03 Nov 2026, 03:50 PM',
    collectedAt: '03 Nov 2026, 06:10 PM',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'First wash cycle of academic year completed smoothly',
    stageHistory: [
      { stage: 'Submitted', timestamp: '03 Nov 2026, 09:15 AM', note: 'Deposit logged for Card ID 1077' },
      { stage: 'Received', timestamp: '03 Nov 2026, 09:30 AM', note: 'Verified by staff as Wash ID 1077-1' },
      { stage: 'Washing', timestamp: '03 Nov 2026, 10:00 AM', note: 'Wash cycle' },
      { stage: 'Drying', timestamp: '03 Nov 2026, 11:30 AM', note: 'Dryer cycle' },
      { stage: 'Ironing/Folding', timestamp: '03 Nov 2026, 02:00 PM', note: 'Pressed' },
      { stage: 'Ready for Collection', timestamp: '03 Nov 2026, 03:50 PM', note: 'Counter notification sent' },
      { stage: 'Collected', timestamp: '03 Nov 2026, 06:10 PM', note: 'Handed over to resident Alex Morgan' }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[SEED] Connected to MongoDB.');

    await User.deleteMany({});
    await LaundryBag.deleteMany({});
    console.log('[SEED] Cleared existing users and bags.');

    const defaultPass = await bcrypt.hash(process.env.SEED_PASSWORD || 'password123', 10);

    for (const s of SEED_STUDENTS) {
      await User.create({
        role: 'student',
        identifier: s.cardId,
        cardId: s.cardId,
        usn: s.usn,
        name: s.name,
        room: s.room,
        password: defaultPass
      });
    }

    for (const st of SEED_STAFF) {
      await User.create({
        role: 'staff',
        identifier: st.identifier,
        name: st.name,
        password: defaultPass
      });
    }

    await LaundryBag.insertMany(SEED_BAGS);
    console.log('[SEED] Successfully seeded default students, staff, and initial bags.');

    await mongoose.disconnect();
    console.log('[SEED] Done.');
  } catch (err) {
    console.error('[SEED] Error seeding data:', err);
    process.exit(1);
  }
}

seed();
