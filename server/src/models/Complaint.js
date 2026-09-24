const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['room', 'electricity', 'water', 'food', 'internet', 'cleaning', 'maintenance', 'security', 'other'],
      default: 'other'
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true
    },
    attachment: { type: String },
    resolutionNotes: [
      {
        text: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        byName: { type: String },
        at: { type: Date, default: Date.now }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

complaintSchema.index({ hostel: 1, status: 1 });
complaintSchema.index({ hostel: 1, student: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);