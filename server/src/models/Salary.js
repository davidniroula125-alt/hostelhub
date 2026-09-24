const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
    staffName: { type: String },
    month: { type: String, required: true },
    basicSalary: { type: Number, default: 0, min: 0 },
    allowance: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deduction: { type: Number, default: 0, min: 0 },
    advance: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, default: 0, min: 0 },
    payDate: { type: Date },
    method: { type: String, enum: ['cash', 'bank', 'esewa', 'khalti', 'other'], default: 'cash' },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    notes: { type: String }
  },
  { timestamps: true }
);

salarySchema.index({ hostel: 1, staff: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);