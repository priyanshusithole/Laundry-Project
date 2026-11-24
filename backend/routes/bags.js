const express = require('express');
const router = express.Router();
const Bag = require('../models/LaundryBag');
const { LAUNDRY_STAGES } = Bag;
const { requireAuth, requireStaff } = require('../middleware/auth');

router.use(requireAuth);

// Students can only see/act on their own bags; staff can access everything
const canAccessCard = (req, cardId) => req.user.role === 'staff' || req.user.identifier === String(cardId).toUpperCase();

// Helper to calculate next stage
function getNextStage(current) {
  const idx = LAUNDRY_STAGES.indexOf(current);
  if (idx === -1 || idx === LAUNDRY_STAGES.length - 1) return current;
  return LAUNDRY_STAGES[idx + 1];
}

// GET /api/bags (List bags with stage/cardId filtering)
router.get('/', async (req, res) => {
  try {
    const { stage, cardId, search } = req.query;
    const filter = {};

    if (stage) {
      if (stage === 'ALL_ACTIVE') filter.notStage = 'Collected';
      else filter.stage = stage;
    }

    if (req.user.role !== 'staff') {
      // Students only ever see their own bags
      filter.cardId = req.user.identifier;
    } else if (cardId) {
      filter.cardId = cardId.toString().trim();
    }

    if (search) filter.search = search.trim();

    res.json(await Bag.list(filter));
  } catch (err) {
    console.error('Fetch bags error:', err);
    res.status(500).json({ error: 'Failed to fetch laundry bags.' });
  }
});

// GET /api/bags/:id (Lookup by Wash ID, Barcode, Card ID, or Mongo ID)
router.get('/:id', async (req, res) => {
  try {
    const queryId = req.params.id.trim();
    
    // Check direct washId
    let bag = await Bag.findByWashId(queryId);
    if (!bag) {
      // Check qrCode payload (e.g. "HL-1077-2")
      bag = await Bag.findByQrCode(queryId);
    }
    if (!bag) {
      // Permanent student QR ("HL-<cardId>") or a bare card ID -> the student's active bag
      const cardId = queryId.replace(/^HL-/i, '');
      bag = await Bag.findActiveByCardId(cardId);
    }

    if (!bag || !canAccessCard(req, bag.cardId)) {
      return res.status(404).json({ error: `No laundry bag record found matching "${queryId}".` });
    }

    res.json(bag);
  } catch (err) {
    console.error('Bag lookup error:', err);
    res.status(500).json({ error: 'Server error during bag lookup.' });
  }
});

// POST /api/bags (Submit New Bag - Student or Staff Intake)
router.post('/', async (req, res) => {
  try {
    const { cardId, usn, studentName, room, totalItems, notes } = req.body;
    // Students can only submit for their own card; staff submit on behalf of a student at the counter
    const effectiveCardId = req.user.role === 'staff'
      ? (cardId || '').toString().trim()
      : req.user.identifier;
    if (!effectiveCardId) {
      return res.status(400).json({ error: 'Card ID is required.' });
    }

    // Count existing washes for this student's card
    const existingCount = await Bag.countByCardId(effectiveCardId);
    const washNumber = existingCount + 1;
    if (washNumber > 30) {
      return res.status(403).json({ error: 'Annual wash quota exhausted (30 of 30 washes used).' });
    }

    const washId = `${effectiveCardId}-${washNumber}`;
    const qrCode = `HL-${washId}`;

    const nowString = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const expDate = new Date();
    expDate.setHours(expDate.getHours() + 6);
    const expectedString = 'Today, ' + expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const count = Math.min(30, Math.max(1, parseInt(totalItems, 10) || 5));

    const newBag = await Bag.create({
      washId,
      cardId: effectiveCardId,
      washNumber,
      qrCode,
      usn: (usn || `ENG24CY0189`).trim().toUpperCase(),
      studentName: studentName ? studentName.trim() : 'Resident Student',
      room: room ? room.trim() : 'Wing 2 - Room 302',
      stage: 'Submitted',
      totalItems: count,
      itemBreakdown: { clothes: count },
      weightKg: Number((count * 0.45).toFixed(1)),
      submittedAt: nowString,
      expectedAt: expectedString,
      assignedStaff: 'Intake Desk',
      notes: notes ? notes.trim() : 'Standard residential fabric care',
      stageHistory: [
        {
          stage: 'Submitted',
          timestamp: nowString,
          note: `Wash cycle #${washNumber} registered for Card ID ${effectiveCardId} (Wash ID: ${washId})`
        }
      ]
    });

    res.status(201).json(newBag);
  } catch (err) {
    console.error('Submit bag error:', err);
    res.status(500).json({ error: 'Failed to submit laundry bag.' });
  }
});

// PATCH /api/bags/:id/stage (Advance stage)
router.patch('/:id/stage', requireStaff, async (req, res) => {
  try {
    const { stage, note } = req.body;
    const bagId = req.params.id.trim();

    if (stage && !LAUNDRY_STAGES.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage "${stage}".` });
    }

    const bag = (await Bag.findByWashId(bagId)) || (await Bag.findById(bagId));
    if (!bag) {
      return res.status(404).json({ error: 'Laundry bag not found.' });
    }

    const nextStage = stage || getNextStage(bag.stage);
    const nowString = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const update = {
      stage: nextStage,
      stageHistory: [
        ...(bag.stageHistory || []),
        { stage: nextStage, timestamp: nowString, note: note || `Advanced to ${nextStage} by staff` }
      ]
    };
    if (nextStage === 'Ready for Collection') {
      update.readyAt = nowString;
      update.pickupBin = bag.pickupBin || 'Wing 2 Counter - Shelf ' + Math.floor(10 + Math.random() * 40);
    }
    if (nextStage === 'Collected') {
      update.collectedAt = nowString;
    }

    res.json(await Bag.updateStage(bag._id, update));
  } catch (err) {
    console.error('Stage update error:', err);
    res.status(500).json({ error: 'Failed to update workflow stage.' });
  }
});

module.exports = router;
