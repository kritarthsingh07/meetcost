const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  ratePerMin: { type: Number, required: true }
}, { _id: false });

const ScheduledMeetingSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true, trim: true },
  date:     { type: Date, required: true },
  duration: { type: Number, required: true, default: 30 },
  members:  [MemberSchema],
  notified: { type: Boolean, default: false },
  createdAt:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduledMeeting', ScheduledMeetingSchema);
