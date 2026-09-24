const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const leaves = require('../controllers/leaveController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.LEAVES, 'read'), leaves.list);
router.post('/', permit(MODULES.LEAVES, 'create'), leaves.create);
router.get('/:id', permit(MODULES.LEAVES, 'read'), leaves.get);
router.post('/:id/decide', permit(MODULES.LEAVES, 'update'), leaves.decide);

module.exports = router;