const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { notify } = require('../services/notificationService');
const { sendMail } = require('../utils/email');
const { logAudit } = require('../services/auditService');

factory.setModel(LeaveRequest);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    population: [{ path: 'student', select: 'name room bedLabel' }],
    sort: '-createdAt',
    listFilter: (req) => {
      const f = {};
      if (req.query.status && req.query.status !== 'all') f.status = req.query.status;
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }), population: [{ path: 'student', select: 'name room bedLabel phone' }] }),
  create: factory.create({
    pre: async (body, req) => {
      const student = await Student.findOne({ _id: body.student, hostel: req.user.hostel });
      if (!student) throw new AppError('Student not found', 404);
      if (!body.startDate || !body.endDate) throw new AppError('Start and end dates are required', 400);
      if (new Date(body.endDate) < new Date(body.startDate)) throw new AppError('End date must be after start date', 400);
      return { ...body, hostel: req.user.hostel, branch: student.branch || req.user.branch };
    },
    audit: { action: 'CREATE_LEAVE', module: 'leaves' }
  }),
  decide: catchAsync(async (req, res, next) => {
    const { status, notes } = req.body;
    if (!['approved', 'rejected', 'cancelled'].includes(status)) return next(new AppError('Invalid status', 400));
    const leaveReq = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, hostel: req.user.hostel },
      { $set: { status, decisionNotes: notes, decidedBy: req.user._id, decidedAt: new Date() } },
      { new: true }
    ).populate('student');
    if (!leaveReq) return next(new AppError('Leave request not found', 404));
    const student = leaveReq.student;
    if (student && student.email) {
      await sendMail(student.email, 'leaveApproval', {
        status,
        startDate: leaveReq.startDate.toISOString().split('T')[0],
        endDate: leaveReq.endDate.toISOString().split('T')[0]
      });
    }
    await notify({
      hostel: req.user.hostel,
      student: leaveReq.student,
      type: 'leave',
      title: `Leave ${status}`,
      message: `Your leave request (${leaveReq.startDate.toISOString().split('T')[0]} to ${leaveReq.endDate.toISOString().split('T')[0]}) was ${status}`
    });
    await logAudit({ req, action: 'DECIDE_LEAVE', module: 'leaves', recordId: req.params.id, description: `Leave ${status}` });
    res.json({ success: true, message: `Leave ${status}`, data: leaveReq });
  })
};