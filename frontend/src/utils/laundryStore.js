/**
 * Hostel Laundry Management System - Shared Data Store
 * Manages active bags, 7-stage workflow, and past laundry records.
 * Backed by the Express/MongoDB API (see the API-backed store section below).
 */

export const LAUNDRY_STAGES = [
  'Submitted',
  'Received',
  'Washing',
  'Drying',
  'Ironing/Folding',
  'Ready for Collection',
  'Collected'
];

/**
 * Academic Year Wash Policy:
 * Each student is issued a permanent Card ID.
 * Each student receives 30 washes for the complete academic year (spanning 2 semesters).
 * Wash ID format: <card_id>-<wash_number> (e.g. Card ID 1077, Wash 2 -> Wash ID 1077-2).
 */
export const TOTAL_ANNUAL_WASHES = 30;
export const TOTAL_SEMESTER_WASHES = TOTAL_ANNUAL_WASHES; // Compatibility alias

export const STUDENT_REGISTRY = [
  { cardId: '1077', usn: 'ENG24CY0189', name: 'Alex Morgan', room: 'Wing 2 - Room 302' },
  { cardId: '1042', usn: 'ENG24CS0142', name: 'Priya Sharma', room: 'Wing 1 - Room 104' },
  { cardId: '1088', usn: 'ENG24EC0088', name: 'Rahul Verma', room: 'Wing 3 - Room 210' },
  { cardId: '1098', usn: 'ENG24ME0098', name: 'Karan Patel', room: 'Wing 2 - Room 108' },
  { cardId: '1051', usn: 'ENG24IT0051', name: 'Tanvi Deshmukh', room: 'Wing 1 - Room 308' }
];

export function normalizeWing(str) {
  if (!str) return str;
  return str
    .replace(/Wing\s+A\b/gi, 'Wing 1')
    .replace(/Wing\s+B\b/gi, 'Wing 2')
    .replace(/Wing\s+C\b/gi, 'Wing 3')
    .replace(/Wing\s+D\b/gi, 'Wing 4');
}

export function findStudent(identifier) {
  if (!identifier) return null;
  const clean = identifier.toString().trim().toUpperCase();
  const found = STUDENT_REGISTRY.find(
    s => s.cardId.toUpperCase() === clean || s.usn.toUpperCase() === clean
  );
  if (found) return found;
  // If numeric or alphanumeric not in registry, treat as new cardId
  return {
    cardId: clean,
    usn: clean.startsWith('ENG') ? clean : `STD-${clean}`,
    name: 'Student Resident',
    room: 'Wing 2 - Room 302'
  };
}

// ---------------------------------------------------------------------------
// API-backed store
// The backend (Express + MongoDB) is the source of truth. This module keeps an in-memory cache of the
// bags the signed-in user may see, so the dashboards can keep reading synchronously. Writes are applied
// optimistically, sent to the API in order, and then reconciled with the server's response.
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'hostel_laundry_token';
const POLL_MS = 10000;

let bagCache = [];
let serverActiveCount = null;
let writeQueue = Promise.resolve();

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setSessionToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

export function clearSession() {
  setSessionToken(null);
  bagCache = [];
  serverActiveCount = null;
  notify();
}

function notify() {
  window.dispatchEvent(new CustomEvent('laundry_store_updated', { detail: bagCache }));
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function normalizeBag(b) {
  return {
    ...b,
    id: b.washId || b.id || b._id,
    room: normalizeWing(b.room),
    pickupBin: normalizeWing(b.pickupBin)
  };
}

function upsertBag(bag) {
  const n = normalizeBag(bag);
  const i = bagCache.findIndex(b => b.id === n.id);
  bagCache = i === -1 ? [n, ...bagCache] : bagCache.map((b, idx) => (idx === i ? n : b));
}

/** Fetch the latest bags (and facility traffic) from the API into the cache. */
export async function loadStore() {
  if (!getToken()) return;
  try {
    const [bags, traffic] = await Promise.all([
      apiRequest('/bags'),
      apiRequest('/telemetry/traffic').catch(() => null)
    ]);
    bagCache = bags.map(normalizeBag);
    serverActiveCount = traffic ? traffic.activeCount : null;
    notify();
  } catch (err) {
    if (err.status === 401) {
      window.dispatchEvent(new CustomEvent('laundry_session_expired'));
    } else {
      console.error('Failed to load laundry data:', err);
    }
  }
}

/** Load now and keep refreshing so several users see each other's changes. Returns a stop function. */
export function startStorePolling() {
  loadStore();
  const timer = setInterval(() => { if (!document.hidden) loadStore(); }, POLL_MS);
  return () => clearInterval(timer);
}

function enqueueWrite(task) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

export function getBags() {
  return bagCache;
}

export function getBagById(bagId) {
  if (!bagId) return null;
  const bags = getBags();
  let cleanId = bagId.toString().trim().toUpperCase();
  
  // Handle URL paths if QR code was scanned as URL
  if (cleanId.includes('/')) {
    cleanId = cleanId.split('/').filter(Boolean).pop().trim();
  }
  
  // Handle JSON encoded QR payloads
  if (cleanId.startsWith('{') && cleanId.endsWith('}')) {
    try {
      const parsed = JSON.parse(bagId);
      cleanId = (parsed.washId || parsed.id || parsed.cardId || cleanId).toString().trim().toUpperCase();
    } catch {}
  }
  
  const strippedPrefix = cleanId.startsWith('HL-') ? cleanId.substring(3).trim() : cleanId;

  const directMatch = bags.find(b => 
    b.id.toUpperCase() === cleanId || 
    (b.washId && b.washId.toUpperCase() === cleanId) || 
    (b.qrCode && b.qrCode.toUpperCase() === cleanId) ||
    b.id.toUpperCase() === strippedPrefix ||
    (b.washId && b.washId.toUpperCase() === strippedPrefix) ||
    (b.qrCode && b.qrCode.toUpperCase() === strippedPrefix)
  );
  if (directMatch) return directMatch;
  
  return bags.find(b =>
    (b.cardId && b.cardId.toUpperCase() === cleanId) ||
    (b.usn && b.usn.toUpperCase() === cleanId) ||
    (b.cardId && b.cardId.toUpperCase() === strippedPrefix) ||
    (b.usn && b.usn.toUpperCase() === strippedPrefix)
  ) || null;
}

export function getStudentBags(identifier) {
  if (!identifier) return [];
  const bags = getBags();
  const clean = identifier.toString().trim().toUpperCase();
  return bags.filter(b => 
    (b.cardId && b.cardId.toUpperCase() === clean) || 
    (b.usn && b.usn.toUpperCase() === clean)
  );
}

export function getStudentActiveBag(identifier) {
  const studentBags = getStudentBags(identifier);
  // Return the most recent bag that is not 'Collected'
  return studentBags.find(b => b.stage !== 'Collected') || null;
}

export function getStudentHistory(identifier) {
  const studentBags = getStudentBags(identifier);
  return studentBags.filter(b => b.stage === 'Collected');
}

/**
 * Get the student's academic year wash quota status.
 * Allocation: 30 washes per academic year (2 semesters).
 * Returns: { total, used, remaining, percentUsed, cardId, usn, studentName, isQuotaExhausted }
 */
export function getStudentWashQuota(identifier) {
  const total = TOTAL_ANNUAL_WASHES;
  const student = findStudent(identifier);
  const resolvedCardId = student?.cardId || identifier;
  const resolvedUsn = student?.usn || identifier;
  const resolvedName = student?.name || 'Resident';

  const studentBags = getStudentBags(resolvedCardId);
  const used = studentBags.length;
  const remaining = Math.max(0, total - used);
  const percentUsed = Math.min(100, Math.round((used / total) * 100));

  return {
    total,
    used,
    remaining,
    percentUsed,
    cardId: resolvedCardId,
    usn: resolvedUsn,
    studentName: resolvedName,
    room: normalizeWing(student?.room) || 'Wing 2 - Room 302',
    isQuotaExhausted: remaining === 0
  };
}

export function advanceBagStage(bagId, targetStage, customNote = '') {
  const bags = getBags();
  const index = bags.findIndex(b => b.id === bagId || (b.washId && b.washId === bagId));
  if (index === -1) return null;

  const currentBag = bags[index];
  const currentIndex = LAUNDRY_STAGES.indexOf(currentBag.stage);
  const nextStage = targetStage || (currentIndex < LAUNDRY_STAGES.length - 1 ? LAUNDRY_STAGES[currentIndex + 1] : currentBag.stage);

  const nowString = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const updatedStageHistory = [
    ...(currentBag.stageHistory || []),
    {
      stage: nextStage,
      timestamp: nowString,
      note: customNote || `Advanced to ${nextStage} by staff`
    }
  ];

  const updatedBag = {
    ...currentBag,
    stage: nextStage,
    stageHistory: updatedStageHistory
  };

  if (nextStage === 'Ready for Collection') {
    updatedBag.readyAt = nowString;
    updatedBag.pickupBin = updatedBag.pickupBin || 'Wing 2 Counter - Shelf ' + Math.floor(10 + Math.random() * 40);
  }

  if (nextStage === 'Collected') {
    updatedBag.collectedAt = nowString;
  }

  bagCache = bags.map((b, i) => (i === index ? updatedBag : b));
  notify();

  enqueueWrite(async () => {
    try {
      const saved = await apiRequest(`/bags/${encodeURIComponent(currentBag.washId || currentBag.id)}/stage`, {
        method: 'PATCH',
        body: { stage: nextStage, note: customNote || undefined }
      });
      upsertBag(saved);
      notify();
    } catch (err) {
      console.error('Stage update failed:', err);
      window.dispatchEvent(new CustomEvent('laundry_store_error', { detail: err.message }));
      await loadStore(); // roll back to the server's truth
    }
  });
  return updatedBag;
}

export function submitNewBag({ cardId, usn, studentName, room, totalItems, itemBreakdown, notes }) {
  const bags = getBags();
  
  // Resolve student from cardId or USN
  const effectiveId = cardId || usn || '1077';
  const student = findStudent(effectiveId);
  const resolvedCardId = cardId ? cardId.toString().trim() : (student?.cardId || '1077');
  const resolvedUsn = usn ? usn.trim().toUpperCase() : (student?.usn || `ENG24CY0189`);
  const resolvedName = studentName || student?.name || 'Resident';
  const resolvedRoom = normalizeWing(room || student?.room || 'Wing 2 - Room 302');

  // Calculate next wash number for this student's card
  const existingForCard = bags.filter(b => 
    (b.cardId && b.cardId.toUpperCase() === resolvedCardId.toUpperCase()) ||
    (b.usn && b.usn.toUpperCase() === resolvedUsn.toUpperCase())
  );
  const washNumber = existingForCard.length + 1;
  const washId = `${resolvedCardId}-${washNumber}`;

  const nowString = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Calculate estimated completion (6 hours ahead)
  const expDate = new Date();
  expDate.setHours(expDate.getHours() + 6);
  const expectedString = 'Today, ' + expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newBag = {
    id: washId,
    washId: washId,
    cardId: resolvedCardId,
    washNumber: washNumber,
    qrCode: `HL-${washId}`,
    usn: resolvedUsn,
    studentName: resolvedName,
    room: resolvedRoom,
    stage: 'Submitted',
    totalItems: parseInt(totalItems, 10) || 5,
    itemBreakdown: itemBreakdown || { clothes: parseInt(totalItems, 10) || 5 },
    weightKg: ((parseInt(totalItems, 10) || 5) * 0.45).toFixed(1),
    submittedAt: nowString,
    expectedAt: expectedString,
    assignedStaff: 'Intake Desk',
    notes: notes || 'Standard residential wash',
    stageHistory: [
      { stage: 'Submitted', timestamp: nowString, note: `Wash cycle #${washNumber} registered for Card ID ${resolvedCardId} (Wash ID: ${washId})` }
    ]
  };

  bagCache = [newBag, ...bags];
  notify();

  enqueueWrite(async () => {
    try {
      const saved = await apiRequest('/bags', {
        method: 'POST',
        body: {
          cardId: resolvedCardId,
          usn: resolvedUsn,
          studentName: resolvedName,
          room: resolvedRoom,
          totalItems: newBag.totalItems,
          notes: newBag.notes
        }
      });
      // The server assigns the real wash number / ID; swap the optimistic record for it
      bagCache = bagCache.filter(b => b.id !== newBag.id);
      upsertBag(saved);
      notify();
    } catch (err) {
      console.error('Bag submission failed:', err);
      window.dispatchEvent(new CustomEvent('laundry_store_error', { detail: err.message }));
      await loadStore();
    }
  });
  return newBag;
}


/**
 * Calculate facility traffic metrics, estimated completion days, and laundry load state.
 * Rule:
 * - 1-2 days -> Green / Low Traffic
 * - 3-4 days -> Amber / Medium Traffic
 * - 5+ days (more days) -> Red / High Traffic
 */
export function getFacilityTraffic(overrideLevel = null) {
  const bags = getBags();
  const activeBags = bags.filter(b => b.stage !== 'Collected');
  // Students only receive their own bags, so use the facility-wide count reported by the server
  const count = serverActiveCount !== null ? serverActiveCount : activeBags.length;

  let trafficLevel = 'Low Traffic';
  let trafficClass = 'low';
  let trafficColor = 'green';
  let estimatedDays = '1–2 Days';
  let daysNum = 2;
  let loadLabel = 'Low Load';
  let loadBars = 1;
  let capacityPercent = 35;
  let queueMinutes = 20;

  const effectiveLevel = overrideLevel ? overrideLevel : (count <= 4 ? 'low' : count <= 8 ? 'medium' : 'high');

  if (effectiveLevel === 'high') {
    trafficLevel = 'High Traffic';
    trafficClass = 'high';
    trafficColor = 'red';
    estimatedDays = '5+ Days';
    daysNum = 5;
    loadLabel = 'Heavy Load';
    loadBars = 3;
    capacityPercent = 92;
    queueMinutes = 65;
  } else if (effectiveLevel === 'medium') {
    trafficLevel = 'Medium Traffic';
    trafficClass = 'medium';
    trafficColor = 'amber';
    estimatedDays = '3–4 Days';
    daysNum = 3;
    loadLabel = 'Moderate Load';
    loadBars = 2;
    capacityPercent = 65;
    queueMinutes = 40;
  } else {
    trafficLevel = 'Low Traffic';
    trafficClass = 'low';
    trafficColor = 'green';
    estimatedDays = '1–2 Days';
    daysNum = 2;
    loadLabel = 'Low Load';
    loadBars = 1;
    capacityPercent = 35;
    queueMinutes = 20;
  }

  // Calculate dynamic target completion date
  const now = new Date();
  const targetDateObj = new Date(now.getTime() + daysNum * 24 * 60 * 60 * 1000);
  const targetDateFormatted = targetDateObj.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return {
    activeCount: count,
    estimatedDays,
    daysNum,
    targetDateFormatted,
    trafficLevel,
    trafficClass,
    trafficColor,
    loadLabel,
    loadBars,
    capacityPercent,
    queueMinutes,
    activeWashers: Math.min(8, Math.max(1, Math.round(count * 0.8))),
    totalWashers: 8,
    intakeDeskStatus: 'Intake Counter Open (Ground Floor)'
  };
}
