const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware (CORS is only needed when the frontend runs on a different origin, e.g. local dev)
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Health check (does not need the database)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Hostel Laundry Operations API',
    timestamp: new Date().toISOString()
  });
});

// Make sure MongoDB is connected before any data route runs (serverless-safe, connection is cached)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DATABASE] Connection failed:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/bags', require('./routes/bags'));
app.use('/api/telemetry', require('./routes/telemetry'));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

module.exports = app;
