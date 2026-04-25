const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  position: { type: Number, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  college: { type: String, required: true },
  pincode: { type: String, required: true },
  courses: [{ type: String }],
  cohort: { type: String, default: 'June 2026' },
  joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
