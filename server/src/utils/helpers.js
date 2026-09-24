const AppError = require('./AppError');

const slugify = (str) =>
  String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const paginate = (req, defaults = { page: 1, limit: 20 }) => {
  const page = Math.max(parseInt(req.query.page, 10) || defaults.page, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || defaults.limit, 1), 100);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    result: (query) => ({
      page,
      limit,
      total: query.total,
      totalPages: Math.ceil(query.total / limit) || 0
    })
  };
};

const buildPaginationResult = (data, total, page, limit) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
  data
});

const money = (n) => {
  const v = Number(n) || 0;
  return 'Rs. ' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const toNpr = (n) => Number(n) || 0;

const todayStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const dateRange = (from, to) => {
  const fd = from ? new Date(from) : new Date(0);
  const td = to ? new Date(to) : new Date();
  td.setHours(23, 59, 59, 999);
  if (!from) fd.setHours(0, 0, 0, 0);
  else fd.setHours(0, 0, 0, 0);
  if (fd > td) throw new AppError('From date must be before To date', 400);
  return { $gte: fd, $lte: td };
};

const pad = (n, len = 3) => String(n).padStart(len, '0');

const stripFields = (obj, fields) => {
  const out = { ...obj };
  fields.forEach((f) => delete out[f]);
  return out;
};

const sanitize = (obj) => JSON.parse(JSON.stringify(obj));

const fileUrl = (file, uploadRoot) => {
  if (!file || !file.path) return null;
  const rel = file.path.replace(/\\/g, '/').split(uploadRoot.replace(/\\/g, '/') + '/')[1];
  return rel ? `/uploads/${rel}` : null;
};

module.exports = {
  slugify,
  paginate,
  buildPaginationResult,
  money,
  toNpr,
  todayStr,
  dateRange,
  pad,
  stripFields,
  sanitize,
  fileUrl
};