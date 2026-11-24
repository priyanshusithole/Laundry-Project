const mongoose = require('mongoose');

// Cache the connection across invocations (Vercel serverless functions reuse warm containers).
let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('MONGO_URI is not set.');
    }
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri || 'mongodb://127.0.0.1:27017/hostel_laundry', {
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false
      })
      .then((m) => m)
      .catch((err) => {
        cached.promise = null; // allow retry on the next request
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
