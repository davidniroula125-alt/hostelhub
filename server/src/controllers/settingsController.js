const Hostel = require('../models/Hostel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { logAudit } = require('../services/auditService');

exports.getMealPrices = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.user.hostel).select('settings');
  res.json({ success: true, data: (hostel && hostel.settings && hostel.settings.mealPrices) || {} });
});

exports.updateMealPrices = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.user.hostel);
  const current = (hostel.settings && hostel.settings.mealPrices) || {};
  hostel.settings = { ...hostel.settings, mealPrices: { ...current, ...(req.body || {}) } };
  await hostel.save();
  await logAudit({ req, action: 'UPDATE_MEAL_PRICES', module: 'settings', description: 'Meal prices updated' });
  res.json({ success: true, message: 'Meal prices updated', data: hostel.settings.mealPrices });
});

exports.getRoomTypes = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.user.hostel).select('settings');
  res.json({ success: true, data: ((hostel && hostel.settings && hostel.settings.roomTypes) || ['Single', 'Double', 'Triple', 'Four-bed', 'Five-bed', 'Custom']) });
});

exports.updateRoomTypes = catchAsync(async (req, res, next) => {
  const hostel = await Hostel.findById(req.user.hostel);
  const types = Array.isArray(req.body.roomTypes) ? req.body.roomTypes : [];
  if (!types.length) return next(new AppError('At least one room type is required', 400));
  hostel.settings = { ...hostel.settings, roomTypes: types.slice(0, 20) };
  await hostel.save();
  await logAudit({ req, action: 'UPDATE_ROOM_TYPES', module: 'settings', description: 'Room types updated' });
  res.json({ success: true, message: 'Room types updated', data: hostel.settings.roomTypes });
});