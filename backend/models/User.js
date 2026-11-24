const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['student', 'staff'],
    required: true,
    default: 'student'
  },
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  cardId: {
    type: String,
    trim: true
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
