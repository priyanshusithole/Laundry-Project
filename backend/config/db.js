const { Pool } = require('pg');

// Neon / Vercel Postgres provide DATABASE_URL (or POSTGRES_URL); local dev falls back to a Docker Postgres.
const LOCAL_URL = 'postgres://postgres:postgres@127.0.0.1:5432/hostel_laundry';

function getConnectionString() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
    throw new Error('DATABASE_URL is not set.');
  }
  return url || LOCAL_URL;
}

// Reuse the pool across warm serverless invocations
const globalCache = global.__pgCache || (global.__pgCache = { pool: null, schemaReady: null });

function getPool() {
  if (!globalCache.pool) {
    const connectionString = getConnectionString();
    const isLocal = /127\.0\.0\.1|localhost/.test(connectionString);
    globalCache.pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000
    });
    globalCache.pool.on('error', (err) => console.error('[DATABASE] Idle client error:', err.message));
  }
  return globalCache.pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff')),
  identifier TEXT NOT NULL UNIQUE,
  card_id TEXT,
  usn TEXT,
  name TEXT NOT NULL,
  room TEXT DEFAULT 'Wing 2 - Room 302',
  password TEXT NOT NULL,
  annual_wash_quota INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_usn_idx ON users (usn);

CREATE TABLE IF NOT EXISTS bags (
  id SERIAL PRIMARY KEY,
  wash_id TEXT NOT NULL UNIQUE,
  card_id TEXT NOT NULL,
  wash_number INTEGER NOT NULL,
  qr_code TEXT NOT NULL,
  usn TEXT NOT NULL,
  student_name TEXT NOT NULL,
  room TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Submitted',
  total_items INTEGER NOT NULL CHECK (total_items BETWEEN 1 AND 30),
  item_breakdown JSONB NOT NULL DEFAULT '{}',
  weight_kg NUMERIC NOT NULL DEFAULT 3.0,
  submitted_at TEXT NOT NULL,
  expected_at TEXT NOT NULL,
  ready_at TEXT,
  collected_at TEXT,
  pickup_bin TEXT NOT NULL DEFAULT 'Wing 2 Service Counter (Bin 14)',
  assigned_staff TEXT NOT NULL DEFAULT 'Intake Desk',
  notes TEXT NOT NULL DEFAULT 'Standard residential fabric care',
  stage_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bags_card_idx ON bags (card_id);
CREATE INDEX IF NOT EXISTS bags_stage_idx ON bags (stage);
`;

/** Create tables on first use (idempotent), then return the pool. */
async function connectDB() {
  const pool = getPool();
  if (!globalCache.schemaReady) {
    globalCache.schemaReady = pool.query(SCHEMA).catch((err) => {
      globalCache.schemaReady = null; // retry on next request
      throw err;
    });
  }
  await globalCache.schemaReady;
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = connectDB;
module.exports.query = query;
module.exports.getPool = getPool;
