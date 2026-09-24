const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const buildFilter = (req) => {
  const filter = {};
  if (req.user.role === 'student' && req.user.student) {
    filter.$or = [
      { student: req.user.student },
      { hostel: req.user.hostel, user: null, student: { $in: [null, undefined] } }
    ];
  } else {
    filter.hostel = req.user.hostel;
  }
  return filter;
};

exports.list = catchAsync(async (req, res, next) => {
  const filter = buildFilter(req);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const data = await Notification.find(filter).sort('-createdAt').limit(limit);
  const unread = await Notification.countDocuments({ ...filter, read: false });
  res.json({ success: true, data: { unread, items: data } });
});

exports.unreadCount = catchAsync(async (req, res, next) => {
  const filter = buildFilter(req);
  const unread = await Notification.countDocuments({ ...filter, read: false });
  res.json({ success: true, data: { unread } });
});

exports.markRead = catchAsync(async (req, res, next) => {
  const filter = { ...buildFilter(req), read: false };
  if (req.params.id && req.params.id !== 'all') filter._id = req.params.id;
  const result = await Notification.updateMany(filter, { $set: { read: true, readAt: new Date() } });
  res.json({ success: true, message: 'Notifications updated', data: { modified: result.modifiedCount } });
});

exports.clear = catchAsync(async (req, res, next) => {
  const filter = buildFilter(req);
  await Notification.deleteMany({ ...filter, read: true });
  res.json({ success: true, message: 'Read notifications cleared' });
});