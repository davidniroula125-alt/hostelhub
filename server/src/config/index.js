const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const env = (key, fallback = '') => process.env[key] || fallback;

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(env('PORT', '5000'), 10),
  mongoUri: env('MONGODB_URI', 'mongodb://127.0.0.1:27017/hostelhub'),
  jwtSecret: env('JWT_SECRET', 'insecure-dev-secret'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '7d'),
  clientUrl: env('CLIENT_URL', 'http://localhost:5173'),
  uploadDir: env('UPLOAD_DIR', 'uploads'),
  maxUploadMb: parseInt(env('MAX_UPLOAD_MB', '10'), 10),
  smtp: {
    host: env('SMTP_HOST', ''),
    port: parseInt(env('SMTP_PORT', '587'), 10),
    user: env('SMTP_USER', ''),
    password: env('SMTP_PASSWORD', ''),
    from: env('SMTP_FROM', 'HostelHub <no-reply@hostelhub.app>')
  },
  rateLimitMax: parseInt(env('RATE_LIMIT_MAX', '5000'), 10),
  demoSeed: env('DEMO_SEED', 'true') === 'true'
};