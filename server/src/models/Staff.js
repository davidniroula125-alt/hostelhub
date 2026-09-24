const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: [true, 'Staff name is required'], trim: true },
    photo: { type: String },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    position: {
      type: String,
      enum: ['manager', 'warden', 'accountant', 'cook', 'cleaner', 'security', 'maintenance', 'other'],
      default: 'other'
    },
    joiningDate: { type: Date },
    salary: { type: Number, default: 0 },
    emergencyContact: {
      name: { type: String },
      phone: { type: String }
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

staffSchema.index({ hostel: 1, position: 1 });
staffSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('Staff', staffSchema);