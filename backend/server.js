const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const bagRoutes = require('./routes/bags');
const telemetryRoutes = require('./routes/telemetry');

app.use('/api/auth', authRoutes);
app.use('/api/bags', bagRoutes);
app.use('/api/telemetry', telemetryRoutes);

// Health check root
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Hostel Laundry Operations API',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB & Start Server
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel_laundry';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[DATABASE] Connected to MongoDB successfully.');
    app.listen(PORT, () => {
      console.log(`[SERVER] Laundry API running at http://localhost:${PORT}`);
      console.log(`[SERVER] Configured CORS origin: ${CLIENT_ORIGIN}`);
    });
  })
  .catch((err) => {
    console.warn('[DATABASE] MongoDB connection failed:', err.message);
    console.log('[SERVER] Starting Express server in standalone mode...');
    app.listen(PORT, () => {
      console.log(`[SERVER] Laundry API running at http://localhost:${PORT}`);
    });
  });
