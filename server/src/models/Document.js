const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', index: true },
    category: {
      type: String,
      enum: ['citizenship', 'passport', 'student_id', 'college_id', 'photo', 'admission_form', 'agreement', 'receipt', 'other'],
      default: 'other'
    },
    title: { type: String, trim: true },
    originalName: { type: String },
    mimetype: { type: String },
    size: { type: Number },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

documentSchema.index({ hostel: 1, student: 1, category: 1 });

module.exports = mongoose.model('Document', documentSchema);