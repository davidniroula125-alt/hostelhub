const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const connectDB = require('./config/db');
const { limiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const { ensureSeed } = require('./seed');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (config.env !== 'production') app.use(morgan('dev'));

const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/api', limiter);
app.get('/api/health', (req, res) => res.json({ success: true, message: 'HostelHub API is running', time: new Date().toISOString() }));
app.use('/api', routes);

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else if (config.env === 'production') {
  console.warn('[server] client/dist not found — SPA will not be served. Run: npm run build');
}

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    await ensureSeed();
    app.listen(config.port, () => {
      console.log(`[server] HostelHub API running on http://localhost:${config.port} (${config.env})`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
};

module.exports = { app, start };