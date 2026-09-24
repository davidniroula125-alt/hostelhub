const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');

const isObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v));

let Model = null;

const getAll = ({ scope, searchFields = [], sort = '-createdAt', population = [], listFilter = () => ({}) }) => {
  const M = Model;
  return catchAsync(async (req, res, next) => {
    const baseFilter = { ...scope(req), ...listFilter(req) };

    if (req.query.q && searchFields.length) {
      const or = searchFields.map((f) => ({ [f]: { $regex: String(req.query.q), $options: 'i' } }));
      baseFilter.$or = or;
    }

    if (req.query.status && baseFilter.status === undefined && req.query.status !== 'all') {
      baseFilter.status = req.query.status;
    }
    if (req.query.hostel && (req.user.role === 'superadmin' || req.query.adminHostel)) {
      baseFilter.hostel = req.query.hostel;
    }

    let q = M.find(baseFilter);
    if (population.length) {
      q = q.populate(population);
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const sortBy = req.query.sort || sort;

    const [total, data] = await Promise.all([
      M.countDocuments(baseFilter),
      q.sort(sortBy).skip((page - 1) * limit).limit(limit)
    ]);

    res.json({
      success: true,
      data: buildPaginationResult(data, total, page, limit)
    });
  });
};

const getOne = ({ scope, population = [], paramName = 'id', queryField = '_id', extraFilter = (req) => ({}) }) => {
  const M = Model;
  return catchAsync(async (req, res, next) => {
    const id = req.params[paramName];
    let filter = { [queryField]: id, ...scope(req), ...extraFilter(req) };
    let q = M.findOne(filter);
    if (population.length) q = q.populate(population);
    const doc = await q;
    if (!doc) return next(new AppError(`${M.modelName} not found`, 404));
    res.json({ success: true, data: doc });
  });
};

const create = ({ pre = async (body, req) => body, fields = null, audit = { action: 'CREATE', module: 'record' } }) => {
  const M = Model;
  return catchAsync(async (req, res, next) => {
    let payload = { ...req.body };
    payload = await pre(payload, req);
    if (fields) {
      const cleaned = {};
      fields.forEach((f) => {
        if (payload[f] !== undefined) cleaned[f] = payload[f];
      });
      payload = cleaned;
    }
    const doc = await M.create(payload);
    await logAudit({ req, action: audit.action, module: audit.module, recordId: doc._id, recordType: M.modelName, description: `${M.modelName} created` });
    res.status(201).json({ success: true, message: `${M.modelName} created successfully`, data: doc });
  });
};

const update = ({ pre = async (body, req) => body, fields = null, paramName = 'id', audit = { action: 'UPDATE', module: 'record' } }) => {
  const M = Model;
  return catchAsync(async (req, res, next) => {
    const id = req.params[paramName];
    let payload = { ...req.body };
    payload = await pre(payload, req);
    if (fields) {
      const cleaned = {};
      fields.forEach((f) => {
        if (payload[f] !== undefined) cleaned[f] = payload[f];
      });
      payload = cleaned;
    }
    const filter = { _id: id };
    if (req.user.hostel) filter.hostel = req.user.hostel;
    const doc = await M.findOneAndUpdate(filter, { $set: payload }, { new: true, runValidators: true });
    if (!doc) return next(new AppError(`${M.modelName} not found`, 404));
    await logAudit({ req, action: audit.action, module: audit.module, recordId: id, recordType: M.modelName, description: `${M.modelName} updated` });
    res.json({ success: true, message: `${M.modelName} updated successfully`, data: doc });
  });
};

const remove = ({ paramName = 'id', soft = false, audit = { action: 'DELETE', module: 'record' }, beforeRemove = async () => {} }) => {
  const M = Model;
  return catchAsync(async (req, res, next) => {
    const id = req.params[paramName];
    const filter = { _id: id };
    if (req.user.hostel) filter.hostel = req.user.hostel;
    await beforeRemove(req, id);
    let doc;
    if (soft) {
      doc = await M.findOneAndUpdate(filter, { $set: { status: 'deleted' } }, { new: true });
    } else {
      doc = await M.findOneAndDelete(filter);
    }
    if (!doc) return next(new AppError(`${M.modelName} not found`, 404));
    await logAudit({ req, action: audit.action, module: audit.module, recordId: id, recordType: M.modelName, description: `${M.modelName} deleted` });
    res.json({ success: true, message: `${M.modelName} deleted successfully`, data: doc });
  });
};

module.exports = {
  setModel: (m) => {
    Model = m;
    return module.exports;
  },
  getAll,
  getOne,
  create,
  update,
  remove,
  isObjectId
};