const mongoose = require('mongoose');

const foodPlanSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['monthly', 'weekly', 'daily', 'custom'], default: 'monthly' },
    amount: { type: Number, required: true, min: 0 },
    meals: {
      breakfast: { type: Boolean, default: true },
      lunch: { type: Boolean, default: true },
      dinner: { type: Boolean, default: true },
      snacks: { type: Boolean, default: false }
    },
    mealPrices: {
      breakfast: { type: Number, default: 0 },
      lunch: { type: Number, default: 0 },
      dinner: { type: Number, default: 0 },
      snacks: { type: Number, default: 0 }
    },
    description: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

foodPlanSchema.index({ hostel: 1, name: 1 }, { unique: true });

const foodAssignmentSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodPlan', required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'cancelled', 'completed'], default: 'active' },
    history: [{ from: Date, to: Date, status: String, note: String }]
  },
  { timestamps: true }
);

foodAssignmentSchema.index({ hostel: 1, student: 1, status: 1 });

module.exports = {
  FoodPlan: mongoose.model('FoodPlan', foodPlanSchema),
  FoodAssignment: mongoose.model('FoodAssignment', foodAssignmentSchema)
};