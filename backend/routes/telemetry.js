const express = require('express');
const router = express.Router();
const { LaundryBag } = require('../models/LaundryBag');
const { requireAuth, requireStaff } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/telemetry/metrics (KPI Cards for Staff Dashboard)
router.get('/metrics', requireStaff, async (req, res) => {
  try {
    const allBags = await LaundryBag.find();
    const activeBags = allBags.filter(b => b.stage !== 'Collected');

    res.json({
      totalActive: activeBags.length,
      submitted: allBags.filter(b => b.stage === 'Submitted').length,
      received: allBags.filter(b => b.stage === 'Received').length,
      washing: allBags.filter(b => b.stage === 'Washing').length,
      drying: allBags.filter(b => b.stage === 'Drying').length,
      ironing: allBags.filter(b => b.stage === 'Ironing/Folding').length,
      ready: allBags.filter(b => b.stage === 'Ready for Collection').length,
      collectedToday: allBags.filter(b => b.stage === 'Collected').length
    });
  } catch (err) {
    console.error('Telemetry metrics error:', err);
    res.status(500).json({ error: 'Failed to compute telemetry metrics.' });
  }
});

// GET /api/telemetry/traffic (Queue load & Turnaround estimate)
router.get('/traffic', async (req, res) => {
  try {
    const activeCount = await LaundryBag.countDocuments({ stage: { $ne: 'Collected' } });

    let trafficLevel = 'Low Traffic';
    let trafficClass = 'low';
    let trafficColor = 'green';
    let loadBars = 1;
    let daysToAdd = 2;
    let estimatedDays = '1-2 Days';

    if (activeCount <= 3) {
      trafficLevel = 'Low Traffic';
      trafficClass = 'low';
      trafficColor = 'green';
      loadBars = 1;
      daysToAdd = 2;
      estimatedDays = '1-2 Days';
    } else if (activeCount <= 7) {
      trafficLevel = 'Medium Traffic';
      trafficClass = 'medium';
      trafficColor = 'amber';
      loadBars = 2;
      daysToAdd = 4;
      estimatedDays = '3-4 Days';
    } else {
      trafficLevel = 'High Traffic';
      trafficClass = 'high';
      trafficColor = 'red';
      loadBars = 3;
      daysToAdd = 5;
      estimatedDays = '4-5 Days';
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    const targetDateFormatted = targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    res.json({
      activeCount,
      trafficLevel,
      trafficClass,
      trafficColor,
      loadBars,
      estimatedDays,
      targetDateFormatted
    });
  } catch (err) {
    console.error('Telemetry traffic error:', err);
    res.status(500).json({ error: 'Failed to compute queue traffic.' });
  }
});

module.exports = router;
