const Student = require('../models/Student');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult, fileUrl } = require('../utils/helpers');
const { uploadRoot } = require('../middleware/upload');
const { logAudit } = require('../services/auditService');

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v));

exports.list = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.status && req.query.status !== 'all' && req.query.status !== 'deleted') {
    filter.status = req.query.status;
  }
  if (req.query.room) filter.room = req.query.room;
  if (req.query.gender) filter.gender = req.query.gender;

  if (req.query.q) {
    const rx = { $regex: String(req.query.q), $options: 'i' };
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { studentId: rx }, { citizenshipNumber: rx }];
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const sort = req.query.sort || '-createdAt';

  const [total, data] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .populate({ path: 'room', select: 'roomNumber floor' })
      .populate('foodPlan')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.get = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const student = await Student.findOne({ _id: id, hostel: req.user.hostel })
    .populate({ path: 'room', select: 'roomNumber floor roomType monthlyRent facilities' })
    .populate('foodPlan');
  if (!student) return next(new AppError('Student not found', 404));

  const [invoices, payments, attendance, complaints, leaves, visitors, documents] = await Promise.all([
    Invoice.find({ student: id }).sort({ invoiceDate: -1 }),
    Payment.find({ student: id }).sort({ date: -1 }),
    Attendance.find({ student: id }).sort({ date: -1 }).limit(90),
    require('../models/Complaint').find({ student: id }).sort({ createdAt: -1 }),
    require('../models/LeaveRequest').find({ student: id }).sort({ createdAt: -1 }),
    require('../models/Visitor').find({ student: id }).sort({ entryTime: -1 }),
    require('../models/Document').find({ student: id }).sort({ createdAt: -1 })
  ]);

  res.json({ success: true, data: { ...student.toObject(), invoices, payments, attendance, complaints, leaves, visitors, documents } });
});

exports.create = catchAsync(async (req, res, next) => {
  const body = req.body;
  const student = await Student.create({
    ...body,
    hostel: req.user.hostel,
    branch: body.branch || req.user.branch
  });
  await logAudit({ req, action: 'CREATE_STUDENT', module: 'students', recordId: student._id, description: `Added student ${student.name}` });
  res.status(201).json({ success: true, message: 'Student added successfully', data: student });
});

exports.update = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const student = await Student.findOneAndUpdate(
    { _id: id, hostel: req.user.hostel },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!student) return next(new AppError('Student not found', 404));
  await logAudit({ req, action: 'UPDATE_STUDENT', module: 'students', recordId: id, description: `Updated student ${student.name}` });
  res.json({ success: true, message: 'Student updated', data: student });
});

exports.remove = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const student = await Student.findOne({ _id: id, hostel: req.user.hostel });
  if (!student) return next(new AppError('Student not found', 404));

  const [invoices, payments] = await Promise.all([Invoice.countDocuments({ student: id }), Payment.countDocuments({ student: id })]);
  if (invoices || payments) {
    return next(new AppError('Cannot delete student with financial records. Use Checkout instead.', 409));
  }
  await student.deleteOne();
  await logAudit({ req, action: 'DELETE_STUDENT', module: 'students', recordId: id, description: `Deleted student ${student.name}` });
  res.json({ success: true, message: 'Student deleted' });
});

exports.photo = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  if (!req.file) return next(new AppError('No file uploaded', 400));
  const url = fileUrl(req.file, uploadRoot);
  const student = await Student.findOneAndUpdate({ _id: id, hostel: req.user.hostel }, { $set: { photo: url } }, { new: true });
  if (!student) return next(new AppError('Student not found', 404));
  res.json({ success: true, message: 'Photo updated', data: { photo: url } });
});