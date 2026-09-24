const rateLimit = require('express-rate-limit');
const config = require('../config');

const skipDev = config.env !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipDev,
  message: { success: false, message: 'Too many requests from this IP. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipDev,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

module.exports = { limiter, authLimiter };
