const { FoodPlan, FoodAssignment } = require('../models/FoodPlan');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');
const { syncFoodChargeOnInvoice } = require('../services/billingService');

factory.setModel(FoodPlan);

module.exports.plans = {
  list: factory.getAll({ scope: (req) => ({ hostel: req.user.hostel }), searchFields: ['name'], sort: '-createdAt' }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: factory.create({
    pre: async (body, req) => ({ ...body, hostel: req.user.hostel }),
    audit: { action: 'CREATE_FOOD_PLAN', module: 'food' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_FOOD_PLAN', module: 'food' } }),
  remove: factory.remove({ audit: { action: 'DELETE_FOOD_PLAN', module: 'food' } })
};

module.exports.assignments = {
  list: catchAsync(async (req, res, next) => {
    const filter = { hostel: req.user.hostel };
    if (req.query.student) filter.student = req.query.student;
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const [total, data] = await Promise.all([
      FoodAssignment.countDocuments(filter),
      FoodAssignment.find(filter).populate('student', 'name room bedLabel').populate('plan').sort('-createdAt').skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  }),
  create: catchAsync(async (req, res, next) => {
    const { student, plan, amount, startDate, endDate } = req.body;
    const studentDoc = await Student.findOne({ _id: student, hostel: req.user.hostel });
    if (!studentDoc) return next(new AppError('Student not found', 404));
    const planDoc = await FoodPlan.findOne({ _id: plan, hostel: req.user.hostel });
    if (!planDoc) return next(new AppError('Food plan not found', 404));

    await FoodAssignment.updateMany({ hostel: req.user.hostel, student, status: 'active' }, { $set: { status: 'cancelled' } });
    const assignment = await FoodAssignment.create({
      hostel: req.user.hostel,
      student,
      plan: planDoc._id,
      amount: amount !== undefined ? amount : planDoc.amount,
      startDate: startDate || new Date(),
      endDate,
      status: 'active'
    });
    studentDoc.foodPlan = planDoc._id;
    studentDoc.foodAmount = assignment.amount;
    await studentDoc.save();
    await syncFoodChargeOnInvoice({ studentId: student, hostelId: req.user.hostel, planName: planDoc.name, amount: assignment.amount, asUserId: req.user._id });
    await logAudit({ req, action: 'ASSIGN_FOOD_PLAN', module: 'food', recordId: assignment._id, description: `Assigned ${planDoc.name} to ${studentDoc.name}` });
    res.status(201).json({ success: true, message: 'Food plan assigned', data: assignment });
  }),
  change: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const assignment = await FoodAssignment.findOne({ _id: id, hostel: req.user.hostel });
    if (!assignment) return next(new AppError('Assignment not found', 404));
    const { status, amount, endDate } = req.body;
    if (status) {
      if (!['active', 'paused', 'cancelled', 'completed'].includes(status)) return next(new AppError('Invalid status', 400));
      assignment.status = status;
    }
    if (amount !== undefined) assignment.amount = amount;
    if (endDate !== undefined) assignment.endDate = endDate;
    await assignment.save();
    const effectiveAmount = ['cancelled', 'completed'].includes(assignment.status) ? 0 : assignment.amount;
    const planName = assignment.populated('plan') ? assignment.plan.name : null;
    await syncFoodChargeOnInvoice({ studentId: assignment.student, hostelId: req.user.hostel, planName, amount: effectiveAmount, asUserId: req.user._id });
    await logAudit({ req, action: 'UPDATE_FOOD_ASSIGNMENT', module: 'food', recordId: id, description: `Food assignment ${id} updated` });
    res.json({ success: true, message: 'Assignment updated', data: assignment });
  }),
  remove: catchAsync(async (req, res, next) => {
    const assignment = await FoodAssignment.findOneAndDelete({ _id: req.params.id, hostel: req.user.hostel });
    if (!assignment) return next(new AppError('Assignment not found', 404));
    const student = await Student.findOne({ _id: assignment.student });
    if (student) {
      student.foodPlan = null;
      student.foodAmount = 0;
      await student.save();
    }
    await syncFoodChargeOnInvoice({ studentId: assignment.student, hostelId: req.user.hostel, amount: 0, asUserId: req.user._id });
    await logAudit({ req, action: 'DELETE_FOOD_ASSIGNMENT', module: 'food', recordId: assignment._id, description: 'Food assignment removed' });
    res.json({ success: true, message: 'Assignment removed' });
  })
};