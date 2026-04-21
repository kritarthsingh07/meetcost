const express = require('express');
const Meeting = require('../models/Meeting');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({ user: req.user.id }).sort({ startedAt: -1 });
    res.json({ success: true, meetings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, members, duration, totalCost, startedAt, currency } = req.body;
    const meeting = await Meeting.create({ user: req.user.id, title, members, duration, totalCost, startedAt, currency: currency || 'USD' });
    res.status(201).json({ success: true, meeting });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Meeting.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/', auth, async (req, res) => {
  try {
    await Meeting.deleteMany({ user: req.user.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
