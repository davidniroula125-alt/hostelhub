const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const AppError = require('../utils/AppError');

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']
};

const uploadRoot = path.join(__dirname, '..', '..', config.uploadDir || 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });

const fileFilter = (allowed) => (req, file, cb) => {
  if (!allowed.includes(file.mimetype)) {
    return cb(new AppError(`File type not allowed: ${file.mimetype}. Allowed: ${allowed.join(', ')}`, 415));
  }
  cb(null, true);
};

const makeUploader = (options = {}) => {
  const { allow = 'image', fieldName = 'file', maxMb = config.maxUploadMb, kind = 'documents' } = options;
  const allowed = allow === 'image' ? ALLOWED_TYPES.image : ALLOWED_TYPES.document;
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const tenantDir = req.user && req.user.hostel ? String(req.user.hostel) : 'system';
      const dir = path.join(uploadRoot, kind, tenantDir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
      cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safe}`);
    }
  });
  return multer({
    storage,
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: fileFilter(allowed)
  }).single(fieldName);
};

module.exports = { makeUploader, uploadRoot, ALLOWED_TYPES };