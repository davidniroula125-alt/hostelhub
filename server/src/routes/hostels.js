const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { ROLES } = require('../utils/roles');
const hostel = require('../controllers/hostelController');
const { MODULES } = require('../utils/roles');

router.use(protect, requireHostel);

router.get('/profile', hostel.getProfile);
router.put('/profile', permit(MODULES.SETTINGS, 'update'), hostel.updateProfile);
router.get('/billing-settings', hostel.getBillingSettings);
router.put('/billing-settings', permit(MODULES.SETTINGS, 'update'), hostel.updateBillingSettings);
router.get('/subscription', hostel.getSubscription);

module.exports = router;