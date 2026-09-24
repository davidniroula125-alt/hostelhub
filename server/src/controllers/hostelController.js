const Hostel = require('../models/Hostel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditService');

exports.getProfile = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.user.hostel);
  if (!hostel) return next(new AppError('Hostel not found', 404));
  res.json({ success: true, data: hostel });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const fields = [
    'name', 'type', 'ownerName', 'registrationNumber', 'address', 'phone', 'altPhone',
    'email', 'website', 'logo', 'description', 'emergencyContact', 'rules', 'amenities'
  ];
  const payload = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined) payload[f] = req.body[f];
  });
  const hostel = await Hostel.findOneAndUpdate({ _id: req.user.hostel }, { $set: payload }, { new: true, runValidators: true });
  await logAudit({ req, action: 'UPDATE_HOSTEL', module: 'settings', recordId: hostel._id, description: 'Hostel profile updated' });
  res.json({ success: true, message: 'Hostel profile updated', data: hostel });
});

exports.getBillingSettings = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.user.hostel).select('settings');
  res.json({ success: true, data: (hostel && hostel.settings) || {} });
});

exports.updateBillingSettings = catchAsync(async (req, res, next) => {
  const allowed = ['currency', 'invoicePrefix', 'receiptPrefix', 'dueDay', 'lateFee', 'invoiceFooter', 'billingEmail', 'weekStart'];
  const settings = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) settings[f] = req.body[f];
  });
  const hostel = await Hostel.findById(req.user.hostel);
  hostel.settings = { ...hostel.settings, ...settings };
  await hostel.save();
  await logAudit({ req, action: 'UPDATE_BILLING_SETTINGS', module: 'settings', recordId: hostel._id, description: 'Billing settings updated' });
  res.json({ success: true, message: 'Billing settings updated', data: hostel.settings });
});

exports.getSubscription = catchAsync(async (req, res, next) => {
  const { Subscription } = require('../models/Subscription');
  const sub = await Subscription.findOne({ hostel: req.user.hostel }).sort({ createdAt: -1 }).populate('plan');
  const hostel = await Hostel.findById(req.user.hostel);
  res.json({ success: true, data: { subscription: sub, hostel } });
});