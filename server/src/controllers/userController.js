const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');
const { ROLES } = require('../utils/roles');
const { sendMail } = require('../utils/email');

const HOSTEL_ROLES = [ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.WARDEN, ROLES.STAFF];

exports.list = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.role && req.query.role !== 'all') filter.role = req.query.role;
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.q) {
    const rx = { $regex: req.query.q, $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const [total, data] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).select('-password').sort('name').skip((page - 1) * limit).limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.create = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role, permissions } = req.body;
  if (!HOSTEL_ROLES.includes(role)) return next(new AppError(`Role must be one of: ${HOSTEL_ROLES.join(', ')}`, 400));
  if (!name || !email || !password) return next(new AppError('Name, email and password are required', 400));

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return next(new AppError('A user with this email already exists', 409));

  if (req.user.role === ROLES.MANAGER && role === ROLES.MANAGER) {
    return next(new AppError('Managers cannot create other managers', 403));
  }

  const user = await User.create({
    name, email, phone, password, role,
    hostel: req.user.hostel,
    branch: req.body.branch || req.user.branch,
    permissions: Array.isArray(permissions) ? permissions : []
  });
  await sendMail(email, 'welcome', { name, hostel: '' });
  await logAudit({ req, action: 'CREATE_USER', module: 'users', recordId: user._id, description: `Created ${role} account for ${name}` });
  res.status(201).json({ success: true, message: `${role} account created`, data: user.toSafeJSON() });
});

exports.update = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, hostel: req.user.hostel });
  if (!user) return next(new AppError('User not found', 404));
  const allowed = ['name', 'phone', 'role', 'permissions', 'branch', 'status'];
  const payload = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) payload[f] = req.body[f];
  });
  if (payload.role && !HOSTEL_ROLES.includes(payload.role)) {
    return next(new AppError(`Role must be one of: ${HOSTEL_ROLES.join(', ')}`, 400));
  }
  Object.assign(user, payload);
  if (req.body.password) {
    if (String(req.body.password).length < 6) return next(new AppError('Password must be at least 6 characters', 400));
    user.password = req.body.password;
  }
  await user.save();
  await logAudit({ req, action: 'UPDATE_USER', module: 'users', recordId: user._id, description: `Updated user ${user.name}` });
  res.json({ success: true, message: 'User updated', data: user.toSafeJSON() });
});

exports.remove = catchAsync(async (req, res, next) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, hostel: req.user.hostel });
  if (!user) return next(new AppError('User not found', 404));
  await logAudit({ req, action: 'DELETE_USER', module: 'users', recordId: user._id, description: `Deleted user ${user.name}` });
  res.json({ success: true, message: 'User deleted' });
});

exports.roles = (req, res) => {
  res.json({ success: true, data: HOSTEL_ROLES });
};