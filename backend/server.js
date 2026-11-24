// Local development entry point. On Vercel the Express app is served from /api/index.js instead.
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => console.log('[DATABASE] Connected to MongoDB successfully.'))
  .catch((err) => console.warn('[DATABASE] MongoDB connection failed:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[SERVER] Laundry API running at http://localhost:${PORT}`);
    });
  });
