const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const settings = require('../controllers/settingsController');

router.use(protect, requireHostel);

router.get('/meals', permit(MODULES.SETTINGS, 'update'), settings.getMealPrices);
router.put('/meals', permit(MODULES.SETTINGS, 'update'), settings.updateMealPrices);
router.get('/room-types', permit(MODULES.SETTINGS, 'update'), settings.getRoomTypes);
router.put('/room-types', permit(MODULES.SETTINGS, 'update'), settings.updateRoomTypes);

module.exports = router;