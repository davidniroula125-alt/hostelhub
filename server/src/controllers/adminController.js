const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
const { SubscriptionPlan, Subscription } = require('../models/Subscription');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');
const { ROLES } = require('../utils/roles');

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase(), role: ROLES.SUPERADMIN }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid super admin credentials', 401));
  }
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Super admin logged in', token, data: user.toSafeJSON() });
});

exports.dashboard = catchAsync(async (req, res, next) => {
  const hostels = await Hostel.find();
  const active = hostels.filter((h) => h.status === 'active').length;
  const trial = hostels.filter((h) => h.status === 'trial').length;
  const suspended = hostels.filter((h) => h.status === 'suspended').length;

  const [users, students, payments, subscriptions, plans] = await Promise.all([
    User.find({ role: { $ne: ROLES.SUPERADMIN } }).countDocuments(),
    Student.countDocuments(),
    Payment.find({ status: 'completed' }),
    Subscription.find().populate('plan').sort('-createdAt'),
    SubscriptionPlan.find()
  ]);

  const mrr = subscriptions
    .filter((s) => (s.status === 'active' || s.status === 'trial') && s.plan)
    .reduce((sum, s) => sum + (s.plan.priceMonthly || 0), 0);

  const recent = hostels.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const recentHostels = await Promise.all(
    recent.map(async (h) => {
      const studentsCount = await Student.countDocuments({ hostel: h._id });
      const sub = await Subscription.findOne({ hostel: h._id }).sort('-createdAt').populate('plan');
      return { hostel: h, studentCount: studentsCount, subscription: sub };
    })
  );

  res.json({
    success: true,
    data: {
      stats: {
        totalHostels: hostels.length,
        activeHostels: active,
        trialHostels: trial,
        suspendedHostels: suspended,
        totalUsers: users,
        totalStudents: students,
        totalRevenue: payments.reduce((s, p) => s + p.amount, 0),
        monthlyRecurringRevenue: Math.round(mrr),
        subscriptionCount: subscriptions.length
      },
      recentHostels,
      subscriptions,
      plans,
      payments: await Payment.find().sort('-date').limit(10).populate('student', 'name').populate('hostel', 'name')
    }
  });
});

exports.hostels = {
  list: catchAsync(async (req, res, next) => {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    if (req.query.q) filter.name = { $regex: req.query.q, $options: 'i' };
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const [total, hostels] = await Promise.all([
      Hostel.countDocuments(filter),
      Hostel.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit)
    ]);
    const data = await Promise.all(
      hostels.map(async (h) => {
        const [studentCount, userCount, sub] = await Promise.all([
          Student.countDocuments({ hostel: h._id }),
          User.countDocuments({ hostel: h._id }),
          Subscription.findOne({ hostel: h._id }).sort('-createdAt').populate('plan')
        ]);
        return { hostel: h, studentCount, userCount, subscription: sub };
      })
    );
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  }),
  create: catchAsync(async (req, res, next) => {
    const { name, type, email, phone, ownerName, address, planCode = 'STANDARD', trialDays = 14, password, code } = req.body;
    if (!name || !email) return next(new AppError('Hostel name and owner email are required', 400));

    const plan = await SubscriptionPlan.findOne({ code: planCode.toUpperCase() });
    if (!plan) return next(new AppError('Plan not found', 404));

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return next(new AppError('A user with this email already exists', 409));

    let hostelCode = (code || '').trim().toUpperCase();
    if (hostelCode) {
      if (!/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(hostelCode)) {
        return next(new AppError('Hostel ID must be 3–20 chars (letters, numbers, - or _)', 400));
      }
      const clash = await Hostel.exists({ code: hostelCode });
      if (clash) return next(new AppError(`Hostel ID "${hostelCode}" is already taken`, 409));
    } else {
      hostelCode = await Hostel.generateCode();
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (trialDays || plan.trialDays));

    const hostel = await Hostel.create({ name, code: hostelCode, type: type || 'boys', email, phone, ownerName, address, status: 'trial', trialEndsAt, plan: plan._id });
    const user = await User.create({ name: ownerName || name, email, phone, password: password || 'owner123', role: ROLES.OWNER, hostel: hostel._id });
    await Subscription.create({ hostel: hostel._id, plan: plan._id, status: 'trial', startDate: new Date(), trialEndsAt, endDate: trialEndsAt });

    await logAudit({ req, action: 'ADMIN_CREATE_HOSTEL', module: 'admin', recordId: hostel._id, description: `Created hostel ${name} with ${plan.name} plan` });
    res.status(201).json({ success: true, message: 'Hostel created', data: { hostel, loginEmail: user.email } });
  }),
  update: catchAsync(async (req, res, next) => {
    const hostel = await Hostel.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!hostel) return next(new AppError('Hostel not found', 404));
    await logAudit({ req, action: 'ADMIN_UPDATE_HOSTEL', module: 'admin', recordId: hostel._id, description: 'Hostel updated' });
    res.json({ success: true, message: 'Hostel updated', data: hostel });
  }),
  status: catchAsync(async (req, res, next) => {
    const { status } = req.body;
    if (!['active', 'suspended', 'trial'].includes(status)) return next(new AppError('Invalid status', 400));
    const hostel = await Hostel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!hostel) return next(new AppError('Hostel not found', 404));
    if (status === 'suspended') {
      await User.updateMany({ hostel: hostel._id }, { $set: { status: 'suspended' } });
    } else {
      await User.updateMany({ hostel: hostel._id }, { $set: { status: 'active' } });
    }
    await logAudit({ req, action: 'ADMIN_HOSTEL_STATUS', module: 'admin', recordId: hostel._id, description: `Hostel ${hostel.name} set to ${status}` });
    res.json({ success: true, message: `Hostel ${status}`, data: hostel });
  }),
  detail: catchAsync(async (req, res, next) => {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return next(new AppError('Hostel not found', 404));
    const [studentCount, activeStudents, users, rooms, payments, subscriptions] = await Promise.all([
      Student.countDocuments({ hostel: hostel._id }),
      Student.countDocuments({ hostel: hostel._id, status: { $in: ['active', 'notice'] } }),
      User.find({ hostel: hostel._id }).select('-password'),
      require('../models/Room').countDocuments({ hostel: hostel._id }),
      Payment.find({ hostel: hostel._id, status: 'completed' }),
      Subscription.find({ hostel: hostel._id }).populate('plan').sort('-createdAt')
    ]);
    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    res.json({
      success: true,
      data: {
        hostel,
        stats: { students: studentCount, activeStudents, users: users.length, rooms, revenue },
        users,
        subscriptions
      }
    });
  })
};

exports.auditLogs = {
  list: catchAsync(async (req, res, next) => {
    const filter = {};
    if (req.query.hostel) filter.hostel = req.query.hostel;
    if (req.query.module) filter.module = req.query.module;
    if (req.query.action) filter.action = { $regex: req.query.action, $options: 'i' };
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const [total, data] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).populate('user', 'name role').populate('hostel', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  })
};

exports.users = {
  list: catchAsync(async (req, res, next) => {
    const filter = {};
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
      User.find(filter).select('-password').populate('hostel', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  }),
  status: catchAsync(async (req, res, next) => {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return next(new AppError('Invalid status', 400));
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!user) return next(new AppError('User not found', 404));
    await logAudit({ req, action: 'ADMIN_USER_STATUS', module: 'admin', recordId: user._id, description: `User ${user.email} ${status}` });
    res.json({ success: true, message: `User ${status}`, data: user.toSafeJSON() });
  })
};

exports.plans = {
  list: catchAsync(async (req, res, next) => {
    const plans = await SubscriptionPlan.find().sort('sortOrder');
    res.json({ success: true, data: plans });
  }),
  create: catchAsync(async (req, res, next) => {
    const plan = await SubscriptionPlan.create(req.body);
    await logAudit({ req, action: 'ADMIN_CREATE_PLAN', module: 'plans', recordId: plan._id, description: `Created plan ${plan.name}` });
    res.status(201).json({ success: true, message: 'Plan created', data: plan });
  }),
  update: catchAsync(async (req, res, next) => {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!plan) return next(new AppError('Plan not found', 404));
    await logAudit({ req, action: 'ADMIN_UPDATE_PLAN', module: 'plans', recordId: plan._id, description: `Updated plan ${plan.name}` });
    res.json({ success: true, message: 'Plan updated', data: plan });
  }),
  remove: catchAsync(async (req, res, next) => {
    const used = await Subscription.countDocuments({ plan: req.params.id });
    if (used) return next(new AppError('Cannot delete a plan that has subscriptions', 409));
    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  })
};

exports.subscriptions = {
  list: catchAsync(async (req, res, next) => {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const [total, data] = await Promise.all([
      Subscription.countDocuments(filter),
      Subscription.find(filter).populate('hostel', 'name').populate('plan').sort('-createdAt').skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  }),
  create: catchAsync(async (req, res, next) => {
    const { hostel, plan, amount, method, paidAt, months = 1 } = req.body;
    const hostelDoc = await Hostel.findById(hostel);
    const planDoc = await SubscriptionPlan.findById(plan);
    if (!hostelDoc) return next(new AppError('Hostel not found', 404));
    if (!planDoc) return next(new AppError('Plan not found', 404));

    await Subscription.updateMany({ hostel, status: { $in: ['trial', 'active', 'expired'] } }, { $set: { status: 'cancelled' } });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const sub = await Subscription.create({
      hostel,
      plan: planDoc._id,
      status: 'active',
      startDate,
      endDate,
      amount: amount || planDoc.priceMonthly * months,
      method: method || 'cash',
      paidAt: paidAt || new Date(),
      notes: req.body.notes
    });
    hostelDoc.plan = planDoc._id;
    hostelDoc.status = 'active';
    hostelDoc.trialEndsAt = null;
    await hostelDoc.save();
    await User.updateMany({ hostel }, { $set: { status: 'active' } });

    await logAudit({ req, action: 'ADMIN_CREATE_SUBSCRIPTION', module: 'subscriptions', recordId: sub._id, description: `Subscribed ${hostelDoc.name} to ${planDoc.name}` });
    res.status(201).json({ success: true, message: 'Subscription activated', data: sub });
  }),
  status: catchAsync(async (req, res, next) => {
    const { status } = req.body;
    if (!['trial', 'active', 'cancelled', 'expired', 'suspended'].includes(status)) return next(new AppError('Invalid status', 400));
    const sub = await Subscription.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!sub) return next(new AppError('Subscription not found', 404));
    const hostel = await Hostel.findById(sub.hostel);
    if (hostel) {
      if (status === 'suspended') hostel.status = 'suspended';
      if (status === 'active') hostel.status = 'active';
      if (status === 'trial') hostel.status = 'trial';
      await hostel.save();
    }
    await logAudit({ req, action: 'ADMIN_SUB_STATUS', module: 'subscriptions', recordId: sub._id, description: `Subscription ${status}` });
    res.json({ success: true, message: `Subscription ${status}`, data: sub });
  })
};

exports.payments = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 10000);
  const filter = {};
  if (req.query.hostel) filter.hostel = req.query.hostel;
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.method && req.query.method !== 'all') filter.method = req.query.method;
  const [total, data] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter).populate('hostel', 'name').populate('student', 'name').sort('-date').skip((page - 1) * limit).limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});