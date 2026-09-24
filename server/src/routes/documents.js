const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const documents = require('../controllers/documentController');
const { makeUploader } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const config = require('../config');

router.use(protect, requireHostel);

const upload = makeUploader({ allow: 'document', fieldName: 'file', kind: 'documents' });

router.get('/', permit(MODULES.DOCUMENTS, 'read'), documents.list);
router.post('/upload', permit(MODULES.DOCUMENTS, 'create'), upload, documents.upload);
router.get('/:id', permit(MODULES.DOCUMENTS, 'read'), documents.download);
router.get('/:id/download', permit(MODULES.DOCUMENTS, 'read'), async (req, res) => {
  const { id } = req.params;
  const doc = await require('../models/Document').findOne({ _id: id, hostel: req.user.hostel });
  if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
  const filePath = path.join(__dirname, '..', '..', 'uploads', String(doc.url).replace(/^\/uploads\//, ''));
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File missing on disk' });
  res.download(filePath, doc.originalName || 'download');
});
router.delete('/:id', permit(MODULES.DOCUMENTS, 'delete'), documents.remove);

module.exports = router;