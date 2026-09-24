const AppError = require('../utils/AppError');

const validators = {
  isEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  isPhone: (v) => /^(?:\+?977[- ]?)?(?:98\d{8}|97\d{8}|96\d{8}|01[- ]?\d{7})$/.test(String(v || '').replace(/[\s-]/g, '')),
  isNumeric: (v) => /^-?\d+(\.\d+)?$/.test(String(v)),
  positiveNumber: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0;
  },
  isDate: (v) => !isNaN(new Date(v)),
  in: (arr) => (v) => arr.includes(v),
  required: (v) => v !== undefined && v !== null && String(v).trim() !== '',
  maxLen: (n) => (v) => !v || String(v).length <= n,
  minLen: (n) => (v) => !v || String(v).length >= n
};

const validate = (schema, source = 'body') => (req, res, next) => {
  const input = req[source] || {};
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const applyRules = Array.isArray(rules) ? rules : [rules];
    for (const rule of applyRules) {
      let ok = true;
      if (typeof rule === 'string') {
        const r = validators[rule];
        if (r) ok = r(input[field]);
      } else if (typeof rule === 'object' && rule && rule.validator) {
        const makeFn = validators[rule.validator];
        const fn = typeof rule.validator === 'function' ? rule.validator : makeFn;
        ok = fn ? fn(input[field], rule.args) : true;
        if (ok && rule.transform && input[field] !== undefined) {
          input[field] = rule.transform(input[field]);
        }
      } else if (typeof rule === 'function') {
        ok = rule(input[field]);
      }
      if (!ok) {
        errors[field] = rule.message || `${field} is invalid`;
        break;
      }
    }
  }
  if (Object.keys(errors).length) {
    return next(new AppError('Validation failed', 400, errors));
  }
  next();
};

module.exports = { validate, validators };