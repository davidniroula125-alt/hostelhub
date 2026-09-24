const { Inventory, InventoryTransaction } = require('../models/Inventory');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');

factory.setModel(Inventory);

module.exports.items = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['product', 'supplier', 'location', 'category'],
    sort: '-createdAt',
    listFilter: (req) => {
      const f = {};
      if (req.query.category && req.query.category !== 'all') f.category = req.query.category;
      if (req.query.lowStock === 'true') f.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  create: factory.create({
    pre: async (body, req) => {
      const item = { ...body, hostel: req.user.hostel, branch: body.branch || req.user.branch, openingStock: body.quantity || 0 };
      return item;
    },
    audit: { action: 'CREATE_INVENTORY', module: 'inventory' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_INVENTORY', module: 'inventory' } }),
  remove: factory.remove({ audit: { action: 'DELETE_INVENTORY', module: 'inventory' } }),
  adjust: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { type, quantity, reason, cost } = req.body;
    if (!['in', 'out', 'adjust'].includes(type)) return next(new AppError('Invalid transaction type', 400));
    const qty = Number(quantity);
    if (!qty || qty <= 0) return next(new AppError('Valid positive quantity is required', 400));
    const item = await Inventory.findOne({ _id: id, hostel: req.user.hostel });
    if (!item) return next(new AppError('Inventory item not found', 404));

    if (type === 'out' && item.quantity < qty) return next(new AppError(`Insufficient stock. Current quantity: ${item.quantity}`, 409));
    item.quantity = type === 'in' ? item.quantity + qty : item.quantity - qty;
    if (type === 'adjust') item.quantity = qty;
    await item.save();

    const tx = await InventoryTransaction.create({
      hostel: req.user.hostel,
      inventory: item._id,
      type,
      quantity: type === 'in' ? qty : -qty,
      reason: reason || (type === 'in' ? 'Stock in' : 'Stock out'),
      cost: cost || 0,
      by: req.user._id
    });
    await logAudit({ req, action: 'STOCK_ADJUST', module: 'inventory', recordId: item._id, description: `${type} ${qty} of ${item.product}` });
    res.json({ success: true, message: 'Stock updated', data: { item, transaction: tx } });
  })
};

module.exports.transactions = {
  list: catchAsync(async (req, res, next) => {
    const filter = { hostel: req.user.hostel };
    if (req.query.inventory) filter.inventory = req.query.inventory;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const [total, data] = await Promise.all([
      InventoryTransaction.countDocuments(filter),
      InventoryTransaction.find(filter).populate('inventory', 'product').sort('-date').skip((page - 1) * limit).limit(limit)
    ]);
    res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
  })
};