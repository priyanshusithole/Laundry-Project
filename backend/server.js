// Local development entry point. On Vercel the Express app is served from /api/index.js instead.
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => console.log('[DATABASE] Connected to Postgres successfully.'))
  .catch((err) => console.warn('[DATABASE] Postgres connection failed:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[SERVER] Laundry API running at http://localhost:${PORT}`);
    });
  });
