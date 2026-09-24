const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'maintenance'],
      default: 'available'
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    studentName: { type: String },
    assignedAt: { type: Date },
    history: [
      {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
        studentName: { type: String },
        status: { type: String },
        from: { type: Date },
        to: { type: Date }
      }
    ]
  },
  { _id: true }
);

const roomSchema = new mongoose.Schema(
  {
    hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: String, trim: true },
    roomType: { type: String, default: 'custom', trim: true },
    monthlyRent: { type: Number, default: 0, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },
    facilities: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['available', 'partial', 'full', 'maintenance', 'reserved'],
      default: 'available'
    },
    beds: { type: [bedSchema], default: [] },
    notes: { type: String }
  },
  { timestamps: true }
);

roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hostel: 1, status: 1 });
roomSchema.index({ hostel: 1, floor: 1 });
roomSchema.index({ hostel: 1, roomType: 1 });

const updateRoomStatus = function (beds) {
  const total = beds.length;
  if (!total) return 'available';
  const counts = beds.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {}
  );
  if (counts.maintenance && counts.maintenance === total) return 'maintenance';
  const occupied = counts.occupied || 0;
  if (occupied === 0 && !counts.reserved) return 'available';
  if (occupied === total) return 'full';
  return 'partial';
};

roomSchema.methods.computeStatus = function () {
  this.status = updateRoomStatus(this.beds);
  return this.status;
};

module.exports = mongoose.model('Room', roomSchema);
module.exports.updateRoomStatus = updateRoomStatus;