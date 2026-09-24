const AppError = require('../utils/AppError');
const { hasPermission, ROLES } = require('../utils/roles');

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

exports.permit = (module, action = 'read') => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (req.user.role === ROLES.SUPERADMIN) return next();
  if (hasPermission(req.user, module, action)) return next();
  return next(new AppError(`You do not have permission to ${action} ${module}.`, 403));
};