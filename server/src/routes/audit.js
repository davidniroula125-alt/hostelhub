const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { restrictTo } = require('../middleware/authorize');
const { ROLES } = require('../utils/roles');
const audit = require('../controllers/auditController');

router.use(protect, requireHostel, restrictTo(ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.WARDEN));

router.get('/', audit.list);

module.exports = router;