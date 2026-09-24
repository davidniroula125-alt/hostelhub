const Notice = require('../models/Notice');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { logAudit } = require('../services/auditService');

factory.setModel(Notice);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['title', 'description'],
    sort: '-publishDate',
    listFilter: (req) => {
      const f = {};
      if (req.query.priority && req.query.priority !== 'all') f.priority = req.query.priority;
      if (req.query.active === 'true') {
        f.publishDate = { $lte: new Date() };
        f.$or = [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }];
      }
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: factory.create({
    pre: async (body, req) => ({ ...body, hostel: req.user.hostel, publishedBy: req.user._id, branch: body.branch || req.user.branch }),
    audit: { action: 'CREATE_NOTICE', module: 'notices' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_NOTICE', module: 'notices' } }),
  remove: factory.remove({ audit: { action: 'DELETE_NOTICE', module: 'notices' } })
};