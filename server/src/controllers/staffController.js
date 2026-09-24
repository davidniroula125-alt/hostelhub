const Staff = require('../models/Staff');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { logAudit } = require('../services/auditService');
const { ROLES } = require('../utils/roles');

factory.setModel(Staff);

const STAFF_POSITIONS = ['manager', 'warden', 'accountant', 'cook', 'cleaner', 'security', 'maintenance', 'other'];

const normalizePosition = (pos) => {
  const p = String(pos || '').toLowerCase();
  return STAFF_POSITIONS.includes(p) ? p : 'other';
};

module.exports.basic = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['name', 'phone', 'email', 'position'],
    sort: '-createdAt',
    listFilter: (req) => {
      const f = {};
      if (req.query.position) f.position = normalizePosition(req.query.position);
      if (req.query.status && req.query.status !== 'all') f.status = req.query.status;
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: catchAsync(async (req, res, next) => {
    const body = req.body;
    const staff = await Staff.create({
      ...body,
      hostel: req.user.hostel,
      branch: body.branch || req.user.branch,
      position: normalizePosition(body.position || 'other')
    });
    if (body.createAccount) {
      const email = body.email || `${staff.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}_${staff._id.toString().slice(-4)}@staff.hostelhub.app`;
      const roleMap = {
        manager: ROLES.MANAGER,
        warden: ROLES.WARDEN,
        accountant: ROLES.ACCOUNTANT
      };
      const user = await User.create({
        name: staff.name,
        email,
        phone: staff.phone,
        password: body.portalPassword || 'staff123',
        role: roleMap[staff.position] || ROLES.STAFF,
        hostel: staff.hostel,
        branch: staff.branch,
        staff: staff._id,
        permissions: body.permissions || []
      });
      staff.user = user._id;
      await staff.save();
    }
    await logAudit({ req, action: 'CREATE_STAFF', module: 'staff', recordId: staff._id, description: `Added staff ${staff.name} as ${staff.position}` });
    res.status(201).json({ success: true, message: 'Staff added', data: staff });
  }),
  update: catchAsync(async (req, res, next) => {
    const payload = { ...req.body };
    if (payload.position) payload.position = normalizePosition(payload.position);
    const staff = await Staff.findOneAndUpdate({ _id: req.params.id, hostel: req.user.hostel }, { $set: payload }, { new: true, runValidators: true });
    if (!staff) return next(new AppError('Staff not found', 404));
    await logAudit({ req, action: 'UPDATE_STAFF', module: 'staff', recordId: staff._id, description: `Updated staff ${staff.name}` });
    res.json({ success: true, message: 'Staff updated', data: staff });
  }),
  remove: catchAsync(async (req, res, next) => {
    const staff = await Staff.findOne({ _id: req.params.id, hostel: req.user.hostel });
    if (!staff) return next(new AppError('Staff not found', 404));
    await User.updateMany({ staff: staff._id }, { $set: { status: 'suspended' } });
    await staff.deleteOne();
    await logAudit({ req, action: 'DELETE_STAFF', module: 'staff', recordId: staff._id, description: `Deleted staff ${staff.name}` });
    res.json({ success: true, message: 'Staff deleted' });
  })
};