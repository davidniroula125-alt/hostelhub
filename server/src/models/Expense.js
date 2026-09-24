const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now, index: true },
    method: { type: String, enum: ['cash', 'bank', 'esewa', 'khalti', 'card', 'other'], default: 'cash' },
    vendor: { type: String, trim: true },
    receipt: { type: String },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

expenseSchema.index({ hostel: 1, category: 1 });
expenseSchema.index({ hostel: 1, date: 1, amount: 1 });

module.exports = mongoose.model('Expense', expenseSchema);