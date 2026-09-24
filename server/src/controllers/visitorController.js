const Visitor = require('../models/Visitor');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { notify } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

factory.setModel(Visitor);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['name', 'phone', 'purpose', 'vehicleNumber'],
    population: [{ path: 'student', select: 'name room bedLabel' }],
    sort: '-entryTime',
    listFilter: (req) => {
      const f = {};
      if (req.query.student) f.student = req.query.student;
      if (req.query.date) {
        const d = new Date(req.query.date);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        f.entryTime = { $gte: start, $lte: end };
      }
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }), population: [{ path: 'student', select: 'name room bedLabel' }] }),
  create: factory.create({
    pre: async (body, req) => {
      let branch = req.user.branch;
      if (body.student) {
        const student = await Student.findOne({ _id: body.student, hostel: req.user.hostel });
        if (!student) throw new AppError('Student not found', 404);
        branch = student.branch || branch;
      }
      return { ...body, hostel: req.user.hostel, branch, registeredBy: req.user._id };
    },
    audit: { action: 'VISITOR_IN', module: 'visitors' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_VISITOR', module: 'visitors' } }),
  exit: catchAsync(async (req, res, next) => {
    const visitor = await Visitor.findOneAndUpdate(
      { _id: req.params.id, hostel: req.user.hostel },
      { $set: { exitTime: new Date() } },
      { new: true }
    );
    if (!visitor) return next(new AppError('Visitor not found', 404));
    await logAudit({ req, action: 'VISITOR_OUT', module: 'visitors', recordId: visitor._id, description: `${visitor.name} exited` });
    res.json({ success: true, message: 'Visitor checked out', data: visitor });
  }),
  remove: factory.remove({ audit: { action: 'DELETE_VISITOR', module: 'visitors' } })
};