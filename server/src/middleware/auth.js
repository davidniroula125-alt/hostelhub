const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const config = require('../config');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(new AppError('Not logged in. Please log in to continue.', 401));

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, config.jwtSecret);
  } catch (err) {
    return next(new AppError('Session expired or invalid. Please log in again.', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user || user.status !== 'active') {
    return next(new AppError('This account is no longer active.', 401));
  }
  if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    return next(new AppError('Password was changed. Please log in again.', 401));
  }

  req.user = user;
  req.token = token;
  next();
});

exports.optionalAuth = catchAsync(async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (user && user.status === 'active') req.user = user;
    }
  } catch (err) {
    /* ignore */
  }
  next();
});