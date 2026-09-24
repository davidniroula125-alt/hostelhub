const { Utility, MeterReading } = require('../models/Utility');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');
const { notify } = require('../services/notificationService');

factory.setModel(Utility);

module.exports.utilities = {
  list: factory.getAll({ scope: (req) => ({ hostel: req.user.hostel }), searchFields: ['name'], sort: '-createdAt' }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: factory.create({
    pre: async (body, req) => ({ ...body, hostel: req.user.hostel }),
    audit: { action: 'CREATE_UTILITY', module: 'utilities' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_UTILITY', module: 'utilities' } }),
  remove: factory.remove({ audit: { action: 'DELETE_UTILITY', module: 'utilities' } })
};

module.exports.readings = {
  list: catchAsync(async (req, res, next) => {
    const filter = { hostel: req.user.hostel };
    if (req.query.student) filter.student = req.query.student;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const [total, data] = await Promise.all([
      MeterReading.countDocuments(filter),
      MeterReading.find(filter).populate('student', 'name room bedLabel').populate('utility', 'name unit').sort('-date').skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  }),
  create: catchAsync(async (req, res, next) => {
    const { student, utility, previousReading, currentReading, period, ratePerUnit, date } = req.body;
    const studentDoc = await Student.findOne({ _id: student, hostel: req.user.hostel });
    if (!studentDoc) return next(new AppError('Student not found', 404));
    const utilDoc = await Utility.findOne({ _id: utility, hostel: req.user.hostel });
    if (!utilDoc) return next(new AppError('Utility not found', 404));
    if (Number(currentReading) < Number(previousReading)) return next(new AppError('Current reading cannot be lower than previous reading', 400));

    const units = Number(currentReading) - Number(previousReading);
    const rate = ratePerUnit !== undefined ? Number(ratePerUnit) : utilDoc.ratePerUnit;
    const total = units * rate;

    const existing = await MeterReading.findOne({ hostel: req.user.hostel, student, utility, period });
    if (existing) return next(new AppError('Reading for this student and period already exists. Update it instead.', 409));

    const reading = await MeterReading.create({
      hostel: req.user.hostel,
      student,
      utility: utilDoc._id,
      period,
      previousReading: Number(previousReading),
      currentReading: Number(currentReading),
      unitsUsed: units,
      ratePerUnit: rate,
      total,
      date: date || new Date()
    });
    await logAudit({ req, action: 'CREATE_READING', module: 'utilities', recordId: reading._id, description: `${utilDoc.name} reading for ${studentDoc.name}: ${units} ${utilDoc.unit}` });
    res.status(201).json({ success: true, message: 'Reading recorded. Will be billed in the next invoice.', data: reading });
  }),
  update: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const reading = await MeterReading.findOne({ _id: id, hostel: req.user.hostel });
    if (!reading) return next(new AppError('Reading not found', 404));
    const { previousReading, currentReading, ratePerUnit } = req.body;
    if (previousReading !== undefined) reading.previousReading = previousReading;
    if (currentReading !== undefined) reading.currentReading = currentReading;
    if (ratePerUnit !== undefined) reading.ratePerUnit = ratePerUnit;
    if (Number(reading.currentReading) < Number(reading.previousReading)) return next(new AppError('Current reading cannot be lower than previous reading', 400));
    reading.unitsUsed = reading.currentReading - reading.previousReading;
    reading.total = reading.unitsUsed * reading.ratePerUnit;
    await reading.save();
    res.json({ success: true, message: 'Reading updated', data: reading });
  }),
  remove: catchAsync(async (req, res, next) => {
    const reading = await MeterReading.findOneAndDelete({ _id: req.params.id, hostel: req.user.hostel });
    if (!reading) return next(new AppError('Reading not found', 404));
    await logAudit({ req, action: 'DELETE_READING', module: 'utilities', recordId: reading._id, description: 'Meter reading deleted' });
    res.json({ success: true, message: 'Reading deleted' });
  })
};