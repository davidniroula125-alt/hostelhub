const Expense = require('../models/Expense');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { fileUrl } = require('../utils/helpers');
const { uploadRoot } = require('../middleware/upload');

factory.setModel(Expense);

const withHostel = async (body, req) => ({ ...body, hostel: req.user.hostel, branch: body.branch || req.user.branch, createdBy: req.user._id });

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['title', 'vendor', 'category'],
    sort: '-date',
    listFilter: (req) => {
      const f = {};
      if (req.query.category && req.query.category !== 'all') f.category = req.query.category;
      if (req.query.from || req.query.to) {
        const from = req.query.from ? new Date(req.query.from) : new Date(0);
        const to = req.query.to ? new Date(req.query.to) : new Date();
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        f.date = { $gte: from, $lte: to };
      }
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: factory.create({ pre: withHostel, audit: { action: 'CREATE_EXPENSE', module: 'expenses' } }),
  update: factory.update({ audit: { action: 'UPDATE_EXPENSE', module: 'expenses' } }),
  remove: factory.remove({ audit: { action: 'DELETE_EXPENSE', module: 'expenses' } }),
  receipt: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    if (!req.file) return next(new AppError('No file uploaded', 400));
    const url = fileUrl(req.file, uploadRoot);
    const expense = await Expense.findOneAndUpdate({ _id: id, hostel: req.user.hostel }, { $set: { receipt: url } }, { new: true });
    if (!expense) return next(new AppError('Expense not found', 404));
    res.json({ success: true, message: 'Receipt uploaded', data: expense });
  })
};