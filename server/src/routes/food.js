const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const food = require('../controllers/foodController');

router.use(protect, requireHostel);

router.get('/plans', permit(MODULES.FOOD, 'read'), food.plans.list);
router.post('/plans', permit(MODULES.FOOD, 'create'), food.plans.create);
router.get('/plans/:id', permit(MODULES.FOOD, 'read'), food.plans.get);
router.put('/plans/:id', permit(MODULES.FOOD, 'update'), food.plans.update);
router.delete('/plans/:id', permit(MODULES.FOOD, 'delete'), food.plans.remove);

router.get('/assignments', permit(MODULES.FOOD, 'read'), food.assignments.list);
router.post('/assignments', permit(MODULES.FOOD, 'create'), food.assignments.create);
router.put('/assignments/:id', permit(MODULES.FOOD, 'update'), food.assignments.change);
router.delete('/assignments/:id', permit(MODULES.FOOD, 'delete'), food.assignments.remove);

module.exports = router;