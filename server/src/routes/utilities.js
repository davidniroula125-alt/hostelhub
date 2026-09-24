const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const utilities = require('../controllers/utilityController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.UTILITIES, 'read'), utilities.utilities.list);
router.post('/', permit(MODULES.UTILITIES, 'create'), utilities.utilities.create);
router.get('/:id', permit(MODULES.UTILITIES, 'read'), utilities.utilities.get);
router.put('/:id', permit(MODULES.UTILITIES, 'update'), utilities.utilities.update);
router.delete('/:id', permit(MODULES.UTILITIES, 'delete'), utilities.utilities.remove);

router.get('/readings', permit(MODULES.UTILITIES, 'read'), utilities.readings.list);
router.post('/readings', permit(MODULES.UTILITIES, 'create'), utilities.readings.create);
router.put('/readings/:id', permit(MODULES.UTILITIES, 'update'), utilities.readings.update);
router.delete('/readings/:id', permit(MODULES.UTILITIES, 'delete'), utilities.readings.remove);

module.exports = router;