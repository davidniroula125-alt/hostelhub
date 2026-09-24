const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    type: { type: String, default: 'info' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date }
  },
  { timestamps: true }
);

notificationSchema.index({ hostel: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ student: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);