const Attendance = require('../models/Attendance');
const StaffAttendance = require('../models/StaffAttendance');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');

const STATUS = ['present', 'absent', 'leave', 'late'];

exports.studentList = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.date) {
    const d = new Date(req.query.date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };
  }
  if (req.query.student) filter.student = req.query.student;
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if (from || to) {
    filter.date = {};
    if (from) { from.setHours(0, 0, 0, 0); filter.date.$gte = from; }
    if (to) { to.setHours(23, 59, 59, 999); filter.date.$lte = to; }
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const [total, data] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter).populate('student', 'name room bedLabel').sort('-date').skip((page - 1) * limit).limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.bulkMark = catchAsync(async (req, res, next) => {
  const { date, records } = req.body;
  const d = new Date(date || new Date());
  if (!Array.isArray(records) || !records.length) return next(new AppError('records array is required', 400));

  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const day = new Date(start);

  const ops = [];
  for (const r of records) {
    if (!STATUS.includes(r.status)) return next(new AppError(`Invalid status "${r.status}"`, 400));
    const student = await Student.findOne({ _id: r.student, hostel: req.user.hostel });
    if (!student) continue;
    ops.push({
      updateOne: {
        filter: { hostel: req.user.hostel, student: r.student, date: day },
        update: { $set: { status: r.status, remarks: r.remarks || '', markedBy: req.user._id, branch: req.body.branch || student.branch || req.user.branch } },
        upsert: true
      }
    });
  }
  if (!ops.length) return next(new AppError('No valid students found', 400));
  await Attendance.bulkWrite(ops);
  await logAudit({ req, action: 'MARK_ATTENDANCE', module: 'attendance', description: `Marked ${ops.length} student attendance records for ${day.toISOString().split('T')[0]}` });
  res.json({ success: true, message: `Attendance marked for ${ops.length} students` });
});

exports.studentReport = catchAsync(async (req, res, next) => {
  const { from, to, student } = req.query;
  if (!from || !to) return next(new AppError('from and to dates are required', 400));
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(23, 59, 59, 999);

  const filter = { hostel: req.user.hostel, date: { $gte: start, $lte: end } };
  if (student) filter.student = student;

  const records = await Attendance.find(filter);
  const grouped = {};
  for (const r of records) {
    const key = String(r.student);
    if (!grouped[key]) grouped[key] = { student: r.student, present: 0, absent: 0, leave: 0, late: 0, total: 0 };
    grouped[key][r.status] += 1;
    grouped[key].total += 1;
  }
  const result = Object.values(grouped).map((g) => ({
    ...g,
    attendancePercent: g.total ? Math.round(((g.present + g.late) / g.total) * 100) : 0
  }));
  res.json({ success: true, data: { from: start, to: end, report: result } });
});

exports.staffList = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.staff) filter.staff = req.query.staff;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) { const f = new Date(req.query.from); f.setHours(0, 0, 0, 0); filter.date.$gte = f; }
    if (req.query.to) { const t = new Date(req.query.to); t.setHours(23, 59, 59, 999); filter.date.$lte = t; }
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const [total, data] = await Promise.all([
    StaffAttendance.countDocuments(filter),
    StaffAttendance.find(filter).populate('staff', 'name position').sort('-date').skip((page - 1) * limit).limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.staffBulkMark = catchAsync(async (req, res, next) => {
  const { date, records } = req.body;
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  if (!Array.isArray(records) || !records.length) return next(new AppError('records array is required', 400));
  const ops = [];
  for (const r of records) {
    if (!STATUS.includes(r.status)) return next(new AppError(`Invalid status "${r.status}"`, 400));
    const staff = await Staff.findOne({ _id: r.staff, hostel: req.user.hostel });
    if (!staff) continue;
    ops.push({
      updateOne: {
        filter: { hostel: req.user.hostel, staff: r.staff, date: d },
        update: { $set: { status: r.status, remarks: r.remarks || '', markedBy: req.user._id } },
        upsert: true
      }
    });
  }
  await StaffAttendance.bulkWrite(ops);
  await logAudit({ req, action: 'MARK_STAFF_ATTENDANCE', module: 'attendance', description: `Marked ${ops.length} staff attendance records` });
  res.json({ success: true, message: `Staff attendance marked for ${ops.length} members` });
});

exports.staffReport = catchAsync(async (req, res, next) => {
  const { from, to } = req.query;
  if (!from || !to) return next(new AppError('from and to dates are required', 400));
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(23, 59, 59, 999);
  const records = await StaffAttendance.find({ hostel: req.user.hostel, date: { $gte: start, $lte: end } }).populate('staff', 'name position');
  const result = {};
  for (const r of records) {
    const key = String(r.staff._id);
    if (!result[key]) result[key] = { staff: r.staff.name, position: r.staff.position, present: 0, absent: 0, leave: 0, late: 0, total: 0 };
    result[key][r.status] += 1;
    result[key].total += 1;
  }
  res.json({ success: true, data: Object.values(result) });
});