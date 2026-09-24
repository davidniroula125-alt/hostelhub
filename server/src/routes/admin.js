const router = require('express').Router();
const { restrictTo } = require('../middleware/authorize');
const { protect } = require('../middleware/auth');
const { ROLES } = require('../utils/roles');
const { authLimiter } = require('../middleware/rateLimiter');
const admin = require('../controllers/adminController');

router.post('/login', authLimiter, admin.login);

router.use(protect, restrictTo(ROLES.SUPERADMIN));

router.get('/dashboard', admin.dashboard);

router.get('/hostels', admin.hostels.list);
router.post('/hostels', admin.hostels.create);
router.put('/hostels/:id', admin.hostels.update);
router.get('/hostels/:id', admin.hostels.detail);
router.post('/hostels/:id/status', admin.hostels.status);

router.get('/plans', admin.plans.list);
router.post('/plans', admin.plans.create);
router.put('/plans/:id', admin.plans.update);
router.delete('/plans/:id', admin.plans.remove);

router.get('/subscriptions', admin.subscriptions.list);
router.post('/subscriptions', admin.subscriptions.create);
router.post('/subscriptions/:id/status', admin.subscriptions.status);

router.get('/users', admin.users.list);
router.post('/users/:id/status', admin.users.status);

router.get('/payments', admin.payments);

router.get('/audit-logs', admin.auditLogs.list);

module.exports = router;