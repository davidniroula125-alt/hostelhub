const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const attendance = require('../controllers/attendanceController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.ATTENDANCE, 'read'), attendance.studentList);
router.post('/bulk', permit(MODULES.ATTENDANCE, 'create'), attendance.bulkMark);
router.get('/report', permit(MODULES.ATTENDANCE, 'read'), attendance.studentReport);

router.get('/staff', permit(MODULES.ATTENDANCE, 'read'), attendance.staffList);
router.post('/staff/bulk', permit(MODULES.ATTENDANCE, 'create'), attendance.staffBulkMark);
router.get('/staff/report', permit(MODULES.ATTENDANCE, 'read'), attendance.staffReport);

module.exports = router;