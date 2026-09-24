const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const visitors = require('../controllers/visitorController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.VISITORS, 'read'), visitors.list);
router.post('/', permit(MODULES.VISITORS, 'create'), visitors.create);
router.get('/:id', permit(MODULES.VISITORS, 'read'), visitors.get);
router.put('/:id', permit(MODULES.VISITORS, 'update'), visitors.update);
router.post('/:id/exit', permit(MODULES.VISITORS, 'update'), visitors.exit);
router.delete('/:id', permit(MODULES.VISITORS, 'delete'), visitors.remove);

module.exports = router;