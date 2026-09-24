const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    name: { type: String, required: [true, 'Visitor name is required'], trim: true },
    phone: { type: String, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    relationship: { type: String, trim: true },
    purpose: { type: String, trim: true },
    entryTime: { type: Date, default: Date.now, index: true },
    exitTime: { type: Date },
    idInfo: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    notes: { type: String },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

visitorSchema.index({ hostel: 1, entryTime: 1 });
visitorSchema.index({ hostel: 1, phone: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);