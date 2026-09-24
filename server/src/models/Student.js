const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true }
  },
  { _id: false }
);

const emergencySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relationship: { type: String, trim: true }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: [true, 'Student name is required'], trim: true },
    photo: { type: String },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
    dob: { type: Date },
    nationality: { type: String, default: 'Nepali' },
    citizenshipNumber: { type: String, trim: true },
    passportNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    permanentAddress: { type: String, trim: true },
    currentAddress: { type: String, trim: true },
    college: { type: String, trim: true },
    course: { type: String, trim: true },
    level: { type: String, trim: true },
    studentId: { type: String, trim: true },
    guardian: { type: guardianSchema, default: {} },
    emergency: { type: emergencySchema, default: {} },
    admissionDate: { type: Date, default: Date.now },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    bed: { type: mongoose.Schema.Types.ObjectId },
    bedLabel: { type: String },
    monthlyRent: { type: Number, default: 0, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },
    deposit: {
      amount: { type: Number, default: 0 },
      date: { type: Date },
      method: { type: String },
      refundAmount: { type: Number, default: 0 },
      deduction: { type: Number, default: 0 },
      refundDate: { type: Date },
      refundStatus: { type: String, enum: ['none', 'pending', 'refunded', 'forfeited'], default: 'none' },
      notes: { type: String }
    },
    foodPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodPlan' },
    foodAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'notice', 'checkedout', 'suspended'],
      default: 'active',
      index: true
    },
    outstandingBalance: { type: Number, default: 0, min: 0 },
    admissionForm: {
      reference: { type: String },
      receivedBy: { type: String }
    },
    checkout: {
      date: { type: Date },
      reason: { type: String },
      outstandingRent: { type: Number, default: 0 },
      damageDeduction: { type: Number, default: 0 },
      otherDeduction: { type: Number, default: 0 },
      depositRefund: { type: Number, default: 0 },
      settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String }
    },
    notes: { type: String }
  },
  { timestamps: true }
);

studentSchema.index({ hostel: 1, status: 1 });
studentSchema.index({ hostel: 1, name: 1 });
studentSchema.index({ hostel: 1, room: 1 });
studentSchema.index({ hostel: 1, phone: 1 });
studentSchema.index({ hostel: 1, email: 1 });
studentSchema.index({ hostel: 1, studentId: 1 });
studentSchema.index({ hostel: 1, bed: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Student', studentSchema);