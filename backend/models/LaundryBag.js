const { query } = require('../config/db');

const LAUNDRY_STAGES = [
  'Submitted',
  'Received',
  'Washing',
  'Drying',
  'Ironing/Folding',
  'Ready for Collection',
  'Collected'
];

// Convert a DB row to the camelCase JSON shape the frontend expects
function toBag(r) {
  if (!r) return null;
  return {
    _id: String(r.id),
    washId: r.wash_id,
    cardId: r.card_id,
    washNumber: r.wash_number,
    qrCode: r.qr_code,
    usn: r.usn,
    studentName: r.student_name,
    room: r.room,
    stage: r.stage,
    totalItems: r.total_items,
    itemBreakdown: r.item_breakdown,
    weightKg: Number(r.weight_kg),
    submittedAt: r.submitted_at,
    expectedAt: r.expected_at,
    readyAt: r.ready_at || undefined,
    collectedAt: r.collected_at || undefined,
    pickupBin: r.pickup_bin,
    assignedStaff: r.assigned_staff,
    notes: r.notes,
    stageHistory: r.stage_history,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

async function list({ stage, notStage, cardId, search } = {}) {
  const where = [];
  const params = [];
  if (stage) { params.push(stage); where.push(`stage = $${params.length}`); }
  if (notStage) { params.push(notStage); where.push(`stage <> $${params.length}`); }
  if (cardId) { params.push(cardId); where.push(`card_id = $${params.length}`); }
  if (search) {
    params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    const p = `$${params.length}`;
    where.push(`(wash_id ILIKE ${p} OR student_name ILIKE ${p} OR usn ILIKE ${p} OR qr_code ILIKE ${p})`);
  }
  const sql = `SELECT * FROM bags ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id DESC`;
  const { rows } = await query(sql, params);
  return rows.map(toBag);
}

async function findOne(sql, params) {
  const { rows } = await query(sql, params);
  return toBag(rows[0]);
}

const findByWashId = (washId) => findOne('SELECT * FROM bags WHERE wash_id = $1', [washId]);
const findByQrCode = (qr) => findOne('SELECT * FROM bags WHERE qr_code = $1', [qr]);
const findActiveByCardId = (cardId) =>
  findOne("SELECT * FROM bags WHERE card_id = $1 AND stage <> 'Collected' ORDER BY created_at ASC, id ASC LIMIT 1", [cardId]);
const findById = (id) => (/^\d+$/.test(String(id)) ? findOne('SELECT * FROM bags WHERE id = $1', [Number(id)]) : null);

const countByCardId = async (cardId) => {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM bags WHERE card_id = $1', [cardId]);
  return rows[0].n;
};

async function countActive() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM bags WHERE stage <> 'Collected'");
  return rows[0].n;
}

async function countByStage() {
  const { rows } = await query('SELECT stage, COUNT(*)::int AS n FROM bags GROUP BY stage');
  return Object.fromEntries(rows.map((r) => [r.stage, r.n]));
}

async function create(b, client) {
  const run = client ? client.query.bind(client) : query;
  const { rows } = await run(
    `INSERT INTO bags (wash_id, card_id, wash_number, qr_code, usn, student_name, room, stage, total_items,
       item_breakdown, weight_kg, submitted_at, expected_at, ready_at, collected_at, pickup_bin, assigned_staff,
       notes, stage_history)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,'Wing 2 Service Counter (Bin 14)'),
       COALESCE($17,'Intake Desk'),COALESCE($18,'Standard residential fabric care'),$19)
     RETURNING *`,
    [
      b.washId, b.cardId, b.washNumber, b.qrCode, b.usn.toUpperCase(), b.studentName, b.room, b.stage || 'Submitted',
      b.totalItems, JSON.stringify(b.itemBreakdown || {}), b.weightKg ?? 3.0, b.submittedAt, b.expectedAt,
      b.readyAt || null, b.collectedAt || null, b.pickupBin || null, b.assignedStaff || null, b.notes || null,
      JSON.stringify(b.stageHistory || [])
    ]
  );
  return toBag(rows[0]);
}

async function updateStage(id, { stage, stageHistory, readyAt, collectedAt, pickupBin }) {
  const { rows } = await query(
    `UPDATE bags SET stage = $2, stage_history = $3, ready_at = COALESCE($4, ready_at),
       collected_at = COALESCE($5, collected_at), pickup_bin = COALESCE($6, pickup_bin), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [Number(id), stage, JSON.stringify(stageHistory), readyAt || null, collectedAt || null, pickupBin || null]
  );
  return toBag(rows[0]);
}

module.exports = {
  LAUNDRY_STAGES, list, findByWashId, findByQrCode, findActiveByCardId, findById,
  countByCardId, countActive, countByStage, create, updateStage
};
