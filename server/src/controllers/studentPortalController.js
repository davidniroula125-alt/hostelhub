const Student = require('../models/Student');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
const Document = require('../models/Document');
const Hostel = require('../models/Hostel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { notify } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

const ownStudent = async (req) => {
  const student = await Student.findById(req.user.student)
    .populate({ path: 'room', select: 'roomNumber floor roomType facilities monthlyRent' })
    .populate('foodPlan');
  if (!student) throw new AppError('Student record not found', 404);
  if (String(student.hostel) !== String(req.user.hostel)) throw new AppError('Unauthorized access', 403);
  return student;
};

exports.dashboard = catchAsync(async (req, res, next) => {
  const student = await ownStudent(req);
  const hostel = await Hostel.findById(student.hostel);
  const [invoices, payments, notices, nextInvoice] = await Promise.all([
    Invoice.find({ student: student._id }).sort('-invoiceDate').limit(6),
    Payment.find({ student: student._id }).sort('-date').limit(6),
    Notice.find({ hostel: student.hostel, visibleTo: { $in: ['all', 'students'] }, publishDate: { $lte: new Date() }, $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }] }).sort('-publishDate').limit(5),
    Invoice.findOne({ student: student._id, status: { $in: ['open', 'partial'] } }).sort('invoiceDate')
  ]);
  res.json({
    success: true,
    data: {
      student,
      hostel: hostel ? { name: hostel.name, address: hostel.address, phone: hostel.phone, email: hostel.email, logo: hostel.logo } : null,
      outstandingBalance: student.outstandingBalance,
      monthlyRent: student.monthlyRent,
      invoices,
      payments,
      notices,
      nextInvoice
    }
  });
});

exports.profile = catchAsync(async (req, res, next) => {
  const student = await ownStudent(req);
  const [documents, attendance] = await Promise.all([
    Document.find({ student: student._id }).sort('-createdAt'),
    Attendance.find({ student: student._id }).sort('-date').limit(30)
  ]);
  res.json({ success: true, data: { ...student.toObject(), documents, attendance } });
});

exports.invoices = catchAsync(async (req, res, next) => {
  const invoices = await Invoice.find({ student: req.user.student }).sort('-invoiceDate');
  res.json({ success: true, data: invoices });
});

exports.invoice = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, student: req.user.student });
  if (!invoice) return next(new AppError('Invoice not found', 404));
  const payments = await Payment.find({ invoice: invoice._id });
  res.json({ success: true, data: { ...invoice.toObject(), payments } });
});

exports.payments = catchAsync(async (req, res, next) => {
  const payments = await Payment.find({ student: req.user.student }).sort('-date');
  res.json({ success: true, data: payments });
});

exports.attendance = catchAsync(async (req, res, next) => {
  const records = await Attendance.find({ student: req.user.student }).sort('-date').limit(90);
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const leave = records.filter((r) => r.status === 'leave').length;
  res.json({
    success: true,
    data: {
      records,
      summary: { present, late, absent, leave, total: records.length, percent: records.length ? Math.round(((present + late) / records.length) * 100) : 0 }
    }
  });
});

exports.leaves = catchAsync(async (req, res, next) => {
  const leaves = await LeaveRequest.find({ student: req.user.student }).sort('-createdAt');
  res.json({ success: true, data: leaves });
});

exports.requestLeave = catchAsync(async (req, res, next) => {
  const { startDate, endDate, reason, emergencyContact } = req.body;
  if (!startDate || !endDate || !reason) return next(new AppError('Start date, end date and reason are required', 400));
  if (new Date(endDate) < new Date(startDate)) return next(new AppError('End date must be after start date', 400));
  const student = await Student.findById(req.user.student);
  const leave = await LeaveRequest.create({
    hostel: req.user.hostel,
    branch: student.branch,
    student: req.user.student,
    startDate,
    endDate,
    reason,
    emergencyContact: emergencyContact || (student.emergency && student.emergency.phone),
    status: 'pending'
  });
  await notify({ hostel: req.user.hostel, type: 'leave', title: 'New leave request', message: `${student.name} requested leave (${startDate} to ${endDate})` });
  await logAudit({ req, action: 'STUDENT_REQUEST_LEAVE', module: 'leaves', recordId: leave._id, description: `${student.name} requested leave` });
  res.status(201).json({ success: true, message: 'Leave request submitted', data: leave });
});

exports.complaints = catchAsync(async (req, res, next) => {
  const complaints = await Complaint.find({ student: req.user.student }).sort('-createdAt');
  res.json({ success: true, data: complaints });
});

exports.createComplaint = catchAsync(async (req, res, next) => {
  const { title, description, category, priority } = req.body;
  if (!title || !description) return next(new AppError('Title and description are required', 400));
  const complaint = await Complaint.create({
    hostel: req.user.hostel,
    student: req.user.student,
    title,
    description,
    category: category || 'other',
    priority: priority || 'medium',
    status: 'open',
    createdBy: req.user._id
  });
  await notify({ hostel: req.user.hostel, type: 'complaint', title: 'New complaint', message: `${title} (${priority})` });
  await logAudit({ req, action: 'STUDENT_CREATE_COMPLAINT', module: 'complaints', recordId: complaint._id, description: `Complaint: ${title}` });
  res.status(201).json({ success: true, message: 'Complaint submitted', data: complaint });
});

exports.notices = catchAsync(async (req, res, next) => {
  const notices = await Notice.find({
    hostel: req.user.hostel,
    visibleTo: { $in: ['all', 'students'] },
    publishDate: { $lte: new Date() },
    $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }]
  }).sort('-publishDate');
  res.json({ success: true, data: notices });
});

exports.uploadComplaintAttachment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const complaint = await Complaint.findOne({ _id: id, student: req.user.student });
  if (!complaint) return next(new AppError('Complaint not found', 404));
  if (!req.file) return next(new AppError('No file uploaded', 400));
  const { fileUrl } = require('../utils/helpers');
  const { uploadRoot } = require('../middleware/upload');
  complaint.attachment = fileUrl(req.file, uploadRoot);
  await complaint.save();
  res.json({ success: true, message: 'Attachment uploaded', data: complaint });
});