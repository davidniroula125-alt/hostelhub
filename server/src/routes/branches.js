const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const branch = require('../controllers/branchController');

router.use(protect, requireHostel);
router.get('/', branch.list);
router.get('/:id', branch.get);
router.post('/', permit(MODULES.SETTINGS, 'update'), branch.create);
router.put('/:id', permit(MODULES.SETTINGS, 'update'), branch.update);
router.delete('/:id', permit(MODULES.SETTINGS, 'delete'), branch.remove);

module.exports = router;