const { query } = require('../config/db');

function toUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    role: r.role,
    identifier: r.identifier,
    cardId: r.card_id,
    usn: r.usn,
    name: r.name,
    room: r.room,
    password: r.password,
    annualWashQuota: r.annual_wash_quota
  };
}

async function findStaff(identifier) {
  const { rows } = await query("SELECT * FROM users WHERE role = 'staff' AND identifier = $1", [identifier]);
  return toUser(rows[0]);
}

// Students may sign in with their Card ID or USN
async function findStudentForLogin(cleanId, rawId) {
  const { rows } = await query(
    "SELECT * FROM users WHERE role = 'student' AND (identifier = $1 OR usn = $1 OR card_id = $2) LIMIT 1",
    [cleanId, rawId]
  );
  return toUser(rows[0]);
}

async function findByIdentifier(identifier) {
  const { rows } = await query('SELECT * FROM users WHERE identifier = $1', [identifier]);
  return toUser(rows[0]);
}

async function create({ role, identifier, cardId, usn, name, room, password }, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO users (role, identifier, card_id, usn, name, room, password)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Wing 2 - Room 302'), $7) RETURNING *`,
    [role, identifier.toUpperCase(), cardId || null, usn ? usn.toUpperCase() : null, name, room || null, password]
  );
  return toUser(rows[0]);
}

module.exports = { findStaff, findStudentForLogin, findByIdentifier, create };
