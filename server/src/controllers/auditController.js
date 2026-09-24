const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');

exports.list = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.module && req.query.module !== 'all') filter.module = req.query.module;
  if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) { const f = new Date(req.query.from); f.setHours(0, 0, 0, 0); filter.createdAt.$gte = f; }
    if (req.query.to) { const t = new Date(req.query.to); t.setHours(23, 59, 59, 999); filter.createdAt.$lte = t; }
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  const [total, data] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .populate('user', 'name role')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});