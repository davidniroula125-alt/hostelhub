const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');

factory.setModel(Branch);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['name', 'address', 'manager'],
    sort: 'createdAt'
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: factory.create({
    pre: async (body, req) => ({ ...body, hostel: req.user.hostel }),
    audit: { action: 'CREATE_BRANCH', module: 'branches' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_BRANCH', module: 'branches' } }),
  remove: factory.remove({ audit: { action: 'DELETE_BRANCH', module: 'branches' } })
};