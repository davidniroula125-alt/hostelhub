const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', index: true },
    roomName: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    assignedToName: { type: String },
    createdDate: { type: Date, default: Date.now },
    assignedDate: { type: Date },
    completedDate: { type: Date },
    cost: { type: Number, default: 0, min: 0 },
    materials: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

maintenanceSchema.index({ hostel: 1, status: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);