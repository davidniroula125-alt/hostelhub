const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { notify } = require('../services/notificationService');
const { sendMail } = require('../utils/email');

factory.setModel(Complaint);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    population: [{ path: 'student', select: 'name room bedLabel' }],
    searchFields: ['title', 'description'],
    sort: '-createdAt',
    listFilter: (req) => {
      const f = {};
      if (req.query.status && req.query.status !== 'all') f.status = req.query.status;
      if (req.query.category && req.query.category !== 'all') f.category = req.query.category;
      if (req.query.priority && req.query.priority !== 'all') f.priority = req.query.priority;
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }), population: [{ path: 'student', select: 'name room bedLabel phone' }] }),
  create: factory.create({
    pre: async (body, req) => {
      let branch = req.user.branch;
      if (body.student) {
        const student = await Student.findOne({ _id: body.student, hostel: req.user.hostel });
        if (!student) throw new AppError('Student not found', 404);
        branch = student.branch || branch;
      }
      return { ...body, hostel: req.user.hostel, branch, createdBy: req.user._id, status: 'open' };
    },
    audit: { action: 'CREATE_COMPLAINT', module: 'complaints' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_COMPLAINT', module: 'complaints' } }),
  resolve: catchAsync(async (req, res, next) => {
    const { status, text } = req.body;
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return next(new AppError('Invalid status', 400));
    const complaint = await Complaint.findOne({ _id: req.params.id, hostel: req.user.hostel }).populate('student');
    if (!complaint) return next(new AppError('Complaint not found', 404));
    complaint.status = status;
    if (text) {
      complaint.resolutionNotes.push({ text, by: req.user._id, byName: req.user.name, at: new Date() });
    }
    await complaint.save();
    const student = complaint.student;
    if (student && student.email) {
      await sendMail(student.email, 'complaintUpdate', { title: complaint.title, status, message: text || `Complaint status updated to ${status}` });
    }
    await notify({ hostel: req.user.hostel, student: complaint.student, type: 'complaint', title: 'Complaint updated', message: `"${complaint.title}" is now ${status}` });
    res.json({ success: true, message: 'Complaint updated', data: complaint });
  }),
  remove: factory.remove({ audit: { action: 'DELETE_COMPLAINT', module: 'complaints' } })
};