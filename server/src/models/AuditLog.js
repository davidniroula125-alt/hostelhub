const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userRole: { type: String },
    userName: { type: String },
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    recordId: { type: String },
    recordType: { type: String },
    description: { type: String },
    meta: { type: Object },
    ip: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ hostel: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);