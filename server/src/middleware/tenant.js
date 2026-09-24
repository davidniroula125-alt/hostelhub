const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/roles');

const scope = (req) => {
  const filter = {};
  if (req.user) {
    if (req.user.hostel) filter.hostel = req.user.hostel;
    else if (req.user.role !== ROLES.SUPERADMIN) filter.hostel = null;
  }
  return filter;
};

const branchScope = (req) => {
  const filter = scope(req);
  if (req.user && req.user.branch) filter.branch = req.user.branch;
  else if (req.query.branch) filter.branch = req.query.branch;
  return filter;
};

const requireHostel = (req, res, next) => {
  if (!req.user || (!req.user.hostel && req.user.role !== ROLES.SUPERADMIN)) {
    return next(new AppError('You are not associated with any hostel.', 403));
  }
  next();
};

const isSuperAdmin = (req) => req.user && req.user.role === ROLES.SUPERADMIN;

module.exports = { scope, branchScope, requireHostel, isSuperAdmin };