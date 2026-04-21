const express          = require('express');
const ScheduledMeeting = require('../models/ScheduledMeeting');
const auth             = require('../middleware/auth');
const router           = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const scheduled = await ScheduledMeeting.find({ user: req.user.id }).sort({ date: 1 });
    res.json({ success: true, scheduled });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, date, duration, members } = req.body;
    const s = await ScheduledMeeting.create({ user: req.user.id, title, date, duration: duration || 30, members: members || [] });
    res.status(201).json({ success: true, scheduled: s });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await ScheduledMeeting.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
