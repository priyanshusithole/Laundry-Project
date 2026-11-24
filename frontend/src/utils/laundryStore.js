/**
 * Hostel Laundry Management System - Shared Data Store
 * Manages active bags, 7-stage workflow, and past laundry records.
 * Synchronizes with localStorage for persistent real-time simulation.
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

const INITIAL_BAGS = [
  {
    id: '1077-2',
    washId: '1077-2',
    cardId: '1077',
    washNumber: 2,
    qrCode: 'HL-1077-2',
    usn: 'ENG24CY0189',
    studentName: 'Alex Morgan',
    room: 'Wing 2 - Room 302',
    stage: 'Washing',
    totalItems: 8,
    itemBreakdown: {
      shirts: 3,
      trousers: 2,
      towels: 2,
      bedding: 1
    },
    weightKg: 3.8,
    submittedAt: 'Today, 09:30 AM',
    expectedAt: 'Today, 04:30 PM',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'Standard eco-wash, mild detergent requested',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 09:30 AM', note: 'Dropped off by resident (Card ID 1077)' },
      { stage: 'Received', timestamp: 'Today, 09:45 AM', note: 'Barcoded as Wash ID 1077-2 by intake staff' },
      { stage: 'Washing', timestamp: 'Today, 10:15 AM', note: 'Washing cycle in progress' }
    ]
  },
  {
    id: '1042-1',
    washId: '1042-1',
    cardId: '1042',
    washNumber: 1,
    qrCode: 'HL-1042-1',
    usn: 'ENG24CS0142',
    studentName: 'Priya Sharma',
    room: 'Wing 1 - Room 104',
    stage: 'Ironing/Folding',
    totalItems: 6,
    itemBreakdown: {
      shirts: 4,
      trousers: 2
    },
    weightKg: 2.4,
    submittedAt: 'Today, 08:15 AM',
    expectedAt: 'Today, 02:30 PM',
    assignedStaff: 'Elena Rostova (EMP-9045)',
    notes: 'Steam press for formal shirts',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 08:15 AM', note: 'Intake scanned (Card ID 1042)' },
      { stage: 'Received', timestamp: 'Today, 08:30 AM', note: 'Sorted by staff' },
      { stage: 'Washing', timestamp: 'Today, 09:00 AM', note: 'Wash cycle completed' },
      { stage: 'Drying', timestamp: 'Today, 10:30 AM', note: 'Dryer cycle completed' },
      { stage: 'Ironing/Folding', timestamp: 'Today, 11:45 AM', note: 'Ironing and folding underway' }
    ]
  },
  {
    id: '1088-1',
    washId: '1088-1',
    cardId: '1088',
    washNumber: 1,
    qrCode: 'HL-1088-1',
    usn: 'ENG24EC0088',
    studentName: 'Rahul Verma',
    room: 'Wing 3 - Room 210',
    stage: 'Ready for Collection',
    totalItems: 10,
    itemBreakdown: {
      shirts: 5,
      trousers: 3,
      hoodies: 2
    },
    weightKg: 4.5,
    submittedAt: 'Yesterday, 03:00 PM',
    expectedAt: 'Today, 11:30 AM',
    readyAt: 'Today, 11:15 AM',
    pickupBin: 'Counter Bay 14 (Wing 2 Desk)',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'Packaged in clean recycled poly-bag',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Yesterday, 03:00 PM', note: 'Intake deposit logged (Card ID 1088)' },
      { stage: 'Received', timestamp: 'Yesterday, 03:30 PM', note: 'Staff verified' },
      { stage: 'Washing', timestamp: 'Yesterday, 04:30 PM', note: 'Wash cycle completed' },
      { stage: 'Drying', timestamp: 'Yesterday, 06:00 PM', note: 'Dryer cycle completed' },
      { stage: 'Ironing/Folding', timestamp: 'Today, 09:30 AM', note: 'Folded & tagged' },
      { stage: 'Ready for Collection', timestamp: 'Today, 11:15 AM', note: 'Placed in Counter Bay 14' }
    ]
  },
  {
    id: '1098-1',
    washId: '1098-1',
    cardId: '1098',
    washNumber: 1,
    qrCode: 'HL-1098-1',
    usn: 'ENG24ME0098',
    studentName: 'Karan Patel',
    room: 'Wing 2 - Room 108',
    stage: 'Drying',
    totalItems: 7,
    itemBreakdown: {
      shirts: 3,
      jeans: 2,
      towels: 2
    },
    weightKg: 3.2,
    submittedAt: 'Today, 10:00 AM',
    expectedAt: 'Today, 05:00 PM',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'Standard wash & dry',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 10:00 AM', note: 'Deposit logged (Card ID 1098)' },
      { stage: 'Received', timestamp: 'Today, 10:20 AM', note: 'Intake verified' },
      { stage: 'Washing', timestamp: 'Today, 10:50 AM', note: 'Cycle completed' },
      { stage: 'Drying', timestamp: 'Today, 11:55 AM', note: 'Dryer cycle running' }
    ]
  },
  {
    id: '1051-1',
    washId: '1051-1',
    cardId: '1051',
    washNumber: 1,
    qrCode: 'HL-1051-1',
    usn: 'ENG24IT0051',
    studentName: 'Tanvi Deshmukh',
    room: 'Wing 1 - Room 308',
    stage: 'Submitted',
    totalItems: 5,
    itemBreakdown: {
      tshirts: 3,
      trousers: 2
    },
    weightKg: 2.1,
    submittedAt: 'Today, 11:30 AM',
    expectedAt: 'Tomorrow, 10:00 AM',
    assignedStaff: 'Unassigned',
    notes: 'Awaiting intake verification',
    stageHistory: [
      { stage: 'Submitted', timestamp: 'Today, 11:30 AM', note: 'Bag intake registered (Card ID 1051)' }
    ]
  },
  {
    id: '1077-1',
    washId: '1077-1',
    cardId: '1077',
    washNumber: 1,
    qrCode: 'HL-1077-1',
    usn: 'ENG24CY0189',
    studentName: 'Alex Morgan',
    room: 'Wing 2 - Room 302',
    stage: 'Collected',
    totalItems: 9,
    itemBreakdown: {
      shirts: 4,
      jeans: 2,
      towels: 3
    },
    weightKg: 4.1,
    submittedAt: '03 Nov 2026, 09:15 AM',
    expectedAt: '03 Nov 2026, 04:30 PM',
    readyAt: '03 Nov 2026, 03:50 PM',
    collectedAt: '03 Nov 2026, 06:10 PM',
    assignedStaff: 'Marcus Vance (EMP-9042)',
    notes: 'First wash cycle of academic year completed smoothly',
    stageHistory: [
      { stage: 'Submitted', timestamp: '03 Nov 2026, 09:15 AM', note: 'Deposit logged for Card ID 1077' },
      { stage: 'Received', timestamp: '03 Nov 2026, 09:30 AM', note: 'Verified by staff as Wash ID 1077-1' },
      { stage: 'Washing', timestamp: '03 Nov 2026, 10:00 AM', note: 'Wash cycle' },
      { stage: 'Drying', timestamp: '03 Nov 2026, 11:30 AM', note: 'Dryer cycle' },
      { stage: 'Ironing/Folding', timestamp: '03 Nov 2026, 02:00 PM', note: 'Pressed' },
      { stage: 'Ready for Collection', timestamp: '03 Nov 2026, 03:50 PM', note: 'Counter notification sent' },
      { stage: 'Collected', timestamp: '03 Nov 2026, 06:10 PM', note: 'Handed over to resident Alex Morgan' }
    ]
  }
];

const STORAGE_KEY = 'hostel_laundry_bags_store_v5';

export function getBags() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BAGS));
      return INITIAL_BAGS;
    }
    const parsed = JSON.parse(raw);
    return parsed.map(b => ({
      ...b,
      room: normalizeWing(b.room),
      pickupBin: normalizeWing(b.pickupBin)
    }));
  } catch (err) {
    console.error('Error reading bags from localStorage:', err);
    return INITIAL_BAGS;
  }
}

export function saveBags(bags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bags));
    window.dispatchEvent(new CustomEvent('laundry_store_updated', { detail: bags }));
  } catch (err) {
    console.error('Error saving bags to localStorage:', err);
  }
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

  bags[index] = updatedBag;
  saveBags(bags);
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

  const updatedBags = [newBag, ...bags];
  saveBags(updatedBags);
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
  const count = activeBags.length;

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
