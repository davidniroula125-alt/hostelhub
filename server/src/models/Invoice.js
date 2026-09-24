const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    type: { type: String, default: 'rent' },
    amount: { type: Number, required: true, min: 0 },
    qty: { type: Number, default: 1 }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    studentName: { type: String },
    studentPhone: { type: String },
    room: { type: String },
    bed: { type: String },
    tenantCopy: { type: String },
    invoiceDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date },
    period: { type: String },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    lateFee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'open', 'partial', 'paid', 'void'],
      default: 'open',
      index: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    voidReason: { type: String }
  },
  { timestamps: true }
);

invoiceSchema.index({ hostel: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ hostel: 1, status: 1 });
invoiceSchema.index({ hostel: 1, student: 1, invoiceDate: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);