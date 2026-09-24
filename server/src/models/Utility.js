const mongoose = require('mongoose');

const utilitySchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: true, trim: true },
    chargeType: { type: String, enum: ['fixed', 'metered', 'perUsage', 'monthly', 'custom'], default: 'fixed' },
    amount: { type: Number, default: 0, min: 0 },
    ratePerUnit: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'unit' },
    billingEnabled: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    appliesTo: { type: String, enum: ['all', 'students', 'rooms'], default: 'all' },
    notes: { type: String }
  },
  { timestamps: true }
);

utilitySchema.index({ hostel: 1, name: 1 }, { unique: true });

const readingSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    utility: { type: mongoose.Schema.Types.ObjectId, ref: 'Utility', required: true },
    period: { type: String },
    previousReading: { type: Number, default: 0 },
    currentReading: { type: Number, default: 0 },
    unitsUsed: { type: Number, default: 0 },
    ratePerUnit: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

readingSchema.index({ hostel: 1, student: 1, utility: 1, period: 1 }, { unique: true });

module.exports = {
  Utility: mongoose.model('Utility', utilitySchema),
  MeterReading: mongoose.model('MeterReading', readingSchema)
};