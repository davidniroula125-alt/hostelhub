const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const staff = require('../controllers/staffController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.STAFF, 'read'), staff.basic.list);
router.post('/', permit(MODULES.STAFF, 'create'), staff.basic.create);
router.get('/:id', permit(MODULES.STAFF, 'read'), staff.basic.get);
router.put('/:id', permit(MODULES.STAFF, 'update'), staff.basic.update);
router.delete('/:id', permit(MODULES.STAFF, 'delete'), staff.basic.remove);

module.exports = router;