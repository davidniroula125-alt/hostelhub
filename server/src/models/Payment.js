const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    receiptNumber: { type: String, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    studentName: { type: String },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },
    invoiceNumber: { type: String },
    amount: { type: Number, required: true, min: 0.5 },
    date: { type: Date, default: Date.now, index: true },
    method: {
      type: String,
      enum: ['cash', 'bank', 'esewa', 'khalti', 'card', 'other'],
      default: 'cash'
    },
    transactionId: { type: String, trim: true },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedByName: { type: String },
    gateway: { type: String, enum: ['manual', 'esewa', 'khalti', 'connectips', 'bank', 'none'], default: 'manual' },
    gatewayStatus: { type: String },
    previousBalance: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'refunded', 'void'], default: 'completed' }
  },
  { timestamps: true }
);

paymentSchema.index({ hostel: 1, receiptNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ hostel: 1, method: 1 });
paymentSchema.index({ hostel: 1, date: 1 });
paymentSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model('Payment', paymentSchema);