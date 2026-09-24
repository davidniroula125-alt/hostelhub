const Student = require('../models/Student');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Complaint = require('../models/Complaint');
const Staff = require('../models/Staff');
const Notice = require('../models/Notice');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.global = catchAsync(async (req, res, next) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: {} });
  const rx = { $regex: q, $options: 'i' };
  const hostel = req.user.hostel;
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

  const results = await Promise.all([
    Student.find({ hostel, $or: [{ name: rx }, { phone: rx }, { studentId: rx }, { email: rx }] }).limit(limit).select('name phone room bedLabel status'),
    Room.find({ hostel, roomNumber: rx }).limit(limit).select('roomNumber floor status'),
    Payment.find({ hostel, $or: [{ studentName: rx }, { receiptNumber: rx }, { transactionId: rx }] }).limit(limit).select('studentName amount method date receiptNumber'),
    Invoice.find({ hostel, $or: [{ studentName: rx }, { invoiceNumber: rx }] }).limit(limit).select('invoiceNumber studentName total balance status'),
    Complaint.find({ hostel, $or: [{ title: rx }, { description: rx }] }).limit(limit).select('title status priority'),
    Staff.find({ hostel, $or: [{ name: rx }, { phone: rx }] }).limit(limit).select('name position status'),
    Notice.find({ hostel, title: rx }).limit(limit).select('title priority publishDate')
  ]);

  res.json({
    success: true,
    data: {
      students: results[0],
      rooms: results[1],
      payments: results[2],
      invoices: results[3],
      complaints: results[4],
      staff: results[5],
      notices: results[6],
      total: results.reduce((s, r) => s + r.length, 0)
    }
  });
});