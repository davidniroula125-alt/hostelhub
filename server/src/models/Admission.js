const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    admissionNumber: { type: String, required: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    bed: { type: String },
    monthlyRent: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    depositMethod: { type: String },
    foodPlan: { type: String },
    admissionDate: { type: Date, default: Date.now },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  },
  { timestamps: true }
);

admissionSchema.index({ hostel: 1, admissionNumber: 1 }, { unique: true });

module.exports = mongoose.model('Admission', admissionSchema);