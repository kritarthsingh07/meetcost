const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  ratePerMin: { type: Number, required: true, min: 0 }
}, { _id: false });

const MeetingSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, required: true, trim: true },
  members:   [MemberSchema],
  duration:  { type: Number, required: true },
  totalCost: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  endedAt:   { type: Date, default: Date.now },
  currency:  { type: String, default: 'USD' }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
