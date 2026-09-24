const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/authorize');
const { ROLES } = require('../utils/roles');
const student = require('../controllers/studentPortalController');
const { makeUploader } = require('../middleware/upload');
const documents = require('../controllers/documentController');

router.use(protect, restrictTo(ROLES.STUDENT));
router.use('/students/:studentId', (req, res, next) => {
  if (String(req.params.studentId) !== String(req.user.student)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  next();
});

router.get('/dashboard', student.dashboard);
router.get('/profile', student.profile);
router.get('/invoices', student.invoices);
router.get('/invoices/:id', student.invoice);
router.get('/payments', student.payments);
router.get('/attendance', student.attendance);
router.get('/leaves', student.leaves);
router.post('/leaves', student.requestLeave);
router.get('/complaints', student.complaints);
router.post('/complaints', student.createComplaint);
router.post('/complaints/:id/attachment', makeUploader({ allow: 'document', fieldName: 'file', kind: 'complaints' }), student.uploadComplaintAttachment);
router.get('/notices', student.notices);

module.exports = router;