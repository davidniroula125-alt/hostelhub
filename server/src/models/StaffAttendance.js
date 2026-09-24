const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'leave', 'late'], default: 'present' },
    remarks: { type: String },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ hostel: 1, staff: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema);