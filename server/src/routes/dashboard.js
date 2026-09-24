const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const dashboard = require('../controllers/dashboardController');

router.use(protect, requireHostel);

router.get('/', dashboard.dashboard);
router.get('/trend', dashboard.trend);
router.get('/activity', dashboard.activity);
router.get('/recent-activity', dashboard.recentActivity);

module.exports = router;