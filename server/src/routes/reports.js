const router = require('express').Router();
const { protect } = require('../middleware/auth');
const reports = require('../controllers/reportController');
const { requireHostel } = require('../middleware/tenant');
const { MODULES } = require('../utils/roles');
const { permit } = require('../middleware/authorize');

router.use(protect, requireHostel);

router.get('/students', permit(MODULES.REPORTS, 'read'), reports.students);
router.get('/occupancy', permit(MODULES.REPORTS, 'read'), reports.occupancy);
router.get('/financial', permit(MODULES.REPORTS, 'read'), reports.financial);
router.get('/expenses', permit(MODULES.REPORTS, 'read'), reports.expenses);
router.get('/rent', permit(MODULES.REPORTS, 'read'), reports.rent);
router.get('/attendance', permit(MODULES.REPORTS, 'read'), reports.studentAttendance);
router.get('/attendance/staff', permit(MODULES.REPORTS, 'read'), reports.staffAttendance);

module.exports = router;