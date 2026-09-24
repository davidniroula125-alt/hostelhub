const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const admissions = require('../controllers/admissionController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.ADMISSIONS, 'read'), admissions.list);
router.get('/available-beds', permit(MODULES.ADMISSIONS, 'read'), admissions.availableBeds);
router.post('/', permit(MODULES.ADMISSIONS, 'create'), admissions.create);

module.exports = router;