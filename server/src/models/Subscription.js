const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, uppercase: true, trim: true },
    priceMonthly: { type: Number, required: true, min: 0 },
    priceYearly: { type: Number, min: 0 },
    maxStudents: { type: Number, default: -1 },
    maxBranches: { type: Number, default: 1 },
    trialDays: { type: Number, default: 14 },
    features: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const subscriptionSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: { type: String, enum: ['trial', 'active', 'expired', 'cancelled', 'suspended'], default: 'trial' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    trialEndsAt: { type: Date },
    amount: { type: Number, default: 0 },
    method: { type: String, enum: ['cash', 'bank', 'esewa', 'khalti', 'card', 'other'], default: 'cash' },
    paidAt: { type: Date },
    notes: { type: String }
  },
  { timestamps: true }
);

subscriptionSchema.index({ hostel: 1, status: 1 });

module.exports = {
  SubscriptionPlan: mongoose.model('SubscriptionPlan', subscriptionPlanSchema),
  Subscription: mongoose.model('Subscription', subscriptionSchema)
};