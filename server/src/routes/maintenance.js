const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const maintenance = require('../controllers/maintenanceController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.MAINTENANCE, 'read'), maintenance.list);
router.post('/', permit(MODULES.MAINTENANCE, 'create'), maintenance.create);
router.get('/:id', permit(MODULES.MAINTENANCE, 'read'), maintenance.get);
router.put('/:id', permit(MODULES.MAINTENANCE, 'update'), maintenance.update);
router.post('/:id/assign', permit(MODULES.MAINTENANCE, 'update'), maintenance.assign);
router.post('/:id/status', permit(MODULES.MAINTENANCE, 'update'), maintenance.status);
router.delete('/:id', permit(MODULES.MAINTENANCE, 'delete'), maintenance.remove);

module.exports = router;