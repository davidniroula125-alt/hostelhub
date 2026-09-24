const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    emergencyContact: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    decisionNotes: { type: String }
  },
  { timestamps: true }
);

leaveSchema.index({ hostel: 1, status: 1 });
leaveSchema.index({ hostel: 1, student: 1 });

module.exports = mongoose.model('LeaveRequest', leaveSchema);