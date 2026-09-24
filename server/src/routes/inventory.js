const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const inventory = require('../controllers/inventoryController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.INVENTORY, 'read'), inventory.items.list);
router.post('/', permit(MODULES.INVENTORY, 'create'), inventory.items.create);
router.get('/transactions', permit(MODULES.INVENTORY, 'read'), inventory.transactions.list);
router.get('/:id', permit(MODULES.INVENTORY, 'read'), inventory.items.get);
router.put('/:id', permit(MODULES.INVENTORY, 'update'), inventory.items.update);
router.post('/:id/adjust', permit(MODULES.INVENTORY, 'update'), inventory.items.adjust);
router.delete('/:id', permit(MODULES.INVENTORY, 'delete'), inventory.items.remove);

module.exports = router;