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
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const laundryBagSchema = new mongoose.Schema({
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
    required: true
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
    trim: true
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
