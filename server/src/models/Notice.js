const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    attachment: { type: String },
    publishDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    visibleTo: { type: String, enum: ['all', 'students', 'staff'], default: 'all' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

noticeSchema.index({ hostel: 1, publishDate: -1 });

module.exports = mongoose.model('Notice', noticeSchema);