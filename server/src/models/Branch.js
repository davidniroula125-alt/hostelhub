const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    manager: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

branchSchema.index({ hostel: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);