const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'leave', 'late'], default: 'present' },
    remarks: { type: String },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

attendanceSchema.index({ hostel: 1, student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hostel: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);