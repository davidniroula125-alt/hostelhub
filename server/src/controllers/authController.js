const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { SubscriptionPlan, Subscription } = require('../models/Subscription');
const config = require('../config');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendMail } = require('../utils/email');
const { logAudit } = require('../services/auditService');
const { notify } = require('../services/notificationService');
const { slugify } = require('../utils/helpers');
const { ROLES } = require('../utils/roles');

const signToken = (id) => jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const attachUserContext = async (user) => {
  let hostel = null;
  if (user.hostel) {
    hostel = await Hostel.findById(user.hostel);
  }
  let student = null;
  if (user.student) {
    student = await Student.findById(user.student).populate('room');
  }
  return { user: user.toSafeJSON(), hostel, student };
};

exports.register = catchAsync(async (req, res, next) => {
  const { name, hostelName, hostelType, email, phone, password, planCode = 'BASIC', hostelCode } = req.body;

  const plan = await SubscriptionPlan.findOne({ code: planCode.toUpperCase(), active: true });
  if (!plan) return next(new AppError('Subscription plan not found or inactive', 400));

  let code = (hostelCode || '').trim().toUpperCase();
  if (code) {
    if (!/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(code)) {
      return next(new AppError('Hostel ID must be 3–20 chars (letters, numbers, - or _)', 400));
    }
    const clash = await Hostel.exists({ code });
    if (clash) return next(new AppError(`Hostel ID "${code}" is already taken`, 409));
  } else {
    code = await Hostel.generateCode();
  }

  const trialDays = plan.trialDays || 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const hostel = await Hostel.create({
    name: hostelName,
    code,
    type: hostelType || 'boys',
    email,
    phone,
    status: 'trial',
    trialEndsAt,
    plan: plan._id
  });

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: ROLES.OWNER,
    hostel: hostel._id,
    permissions: []
  });

  await Subscription.create({
    hostel: hostel._id,
    plan: plan._id,
    status: 'trial',
    startDate: new Date(),
    trialEndsAt,
    endDate: trialEndsAt
  });

  await logAudit({ user, hostel: hostel._id, action: 'REGISTER_HOSTEL', module: 'auth', description: `${hostelName} registered with ${plan.name} plan (${trialDays}-day trial)` });
  await sendMail(user.email, 'welcome', { name: user.name, hostel: hostel.name });

  const token = signToken(user._id);
  res.status(201).json({
    success: true,
    message: `Hostel created. Enjoy your ${trialDays}-day free trial!`,
    token,
    ...(await attachUserContext(user))
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('Email and password are required', 400));

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  if (user.status === 'suspended') {
    return next(new AppError('Your account has been suspended. Contact support.', 403));
  }

  if (user.hostel) {
    const hostel = await Hostel.findById(user.hostel);
    if (hostel && hostel.status === 'suspended') {
      return next(new AppError('This hostel account is suspended. Contact HostelHub support.', 403));
    }
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  res.json({ success: true, message: 'Logged in successfully', token, ...(await attachUserContext(user)) });
});

exports.me = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: await attachUserContext(user) });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowed = ['name', 'phone', 'avatar'];
  const payload = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) payload[f] = req.body[f];
  });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true, runValidators: true });
  res.json({ success: true, message: 'Profile updated', data: user.toSafeJSON() });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return next(new AppError('Current and new password are required', 400));
  if (String(newPassword).length < 6) return next(new AppError('New password must be at least 6 characters', 400));

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 400));
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Email is required', 400));
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return next(new AppError('No account found with that email', 404));

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${config.clientUrl}/reset-password/${token}`;
  const sent = await sendMail(user.email, 'passwordReset', { resetUrl });

  if (!sent && process.env.NODE_ENV !== 'production') {
    return res.json({ success: true, message: 'Password reset link generated', resetToken: token });
  }
  res.json({ success: true, message: 'Password reset link sent to your email' });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password || String(password).length < 6) return next(new AppError('Password must be at least 6 characters', 400));

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() }
  });
  if (!user) return next(new AppError('Password reset token is invalid or expired', 400));

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
});

exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.createStudentAccount = catchAsync(async (req, res, next) => {
  const { studentId, password } = req.body;
  const student = await Student.findOne({ _id: studentId, hostel: req.user.hostel });
  if (!student) return next(new AppError('Student not found', 404));

  let user = await User.findOne({ student: studentId });
  if (user) return next(new AppError('Student account already exists', 409));

  const email = student.email || `${slugify(student.name)}_${student._id.toString().slice(-4)}@student.hostelhub.app`;
  user = await User.create({
    name: student.name,
    email,
    phone: student.phone,
    password: password || 'student123',
    role: ROLES.STUDENT,
    hostel: student.hostel,
    branch: student.branch,
    student: student._id
  });

  await logAudit({ req, action: 'CREATE_STUDENT_ACCOUNT', module: 'auth', recordId: user._id, description: `Created student portal account for ${student.name}` });
  res.status(201).json({ success: true, message: 'Student portal account created', data: { email: user.email } });
});