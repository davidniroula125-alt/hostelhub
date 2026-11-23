const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Hostel name is required'], trim: true },
    code: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    slug: { type: String, unique: true, index: true, lowercase: true, trim: true },
    type: { type: String, enum: ['boys', 'girls', 'mixed'], default: 'boys' },
    ownerName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      province: { type: String, trim: true },
      district: { type: String, trim: true },
      municipality: { type: String, trim: true },
      ward: { type: String, trim: true }
    },
    phone: { type: String, trim: true },
    altPhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    logo: { type: String },
    description: { type: String },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    rules: { type: String },
    status: { type: String, enum: ['trial', 'active', 'suspended'], default: 'trial' },
    trialEndsAt: { type: Date },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    settings: {
      currency: { type: String, default: 'NPR' },
      invoicePrefix: { type: String, default: 'INV' },
      receiptPrefix: { type: String, default: 'RCP' },
      dueDay: { type: Number, default: 5, min: 1, max: 31 },
      lateFee: { type: Number, default: 0, min: 0 },
      invoiceFooter: { type: String },
      billingEmail: { type: String },
      weekStart: { type: String, enum: ['sunday', 'monday', 'saturday'], default: 'sunday' },
      mealPrices: {
        breakfast: { type: Number, default: 50 },
        lunch: { type: Number, default: 100 },
        dinner: { type: Number, default: 100 },
        snacks: { type: Number, default: 30 }
      },
      roomTypes: { type: [String], default: ['Single', 'Double', 'Triple', 'Four-bed', 'Five-bed', 'Custom'] }
    },
    amenities: { type: [String], default: [] }
  },
  { timestamps: true }
);

hostelSchema.pre('validate', function (next) {
  if (this.code) this.code = this.code.trim().toUpperCase();
  next();
});

hostelSchema.pre('save', async function (next) {
  try {
    if (this.isNew && !this.slug && this.name) {
      const base =
        this.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-') || 'hostel';
      let candidate = base;
      for (let i = 0; i < 25; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const clash = await this.constructor.exists({ slug: candidate });
        if (!clash) break;
        candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      this.slug = candidate;
    }
    next();
  } catch (err) {
    next(err);
  }
});

hostelSchema.statics.generateCode = async function () {
  for (let i = 0; i < 50; i += 1) {
    const candidate = `H${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await this.exists({ code: candidate });
    if (!exists) return candidate;
  }
  return `H${Date.now().toString(36).toUpperCase()}`;
};

hostelSchema.index({ status: 1 });

module.exports = mongoose.model('Hostel', hostelSchema);