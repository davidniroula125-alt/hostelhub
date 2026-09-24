const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const notices = require('../controllers/noticeController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.NOTICES, 'read'), notices.list);
router.post('/', permit(MODULES.NOTICES, 'create'), notices.create);
router.get('/:id', permit(MODULES.NOTICES, 'read'), notices.get);
router.put('/:id', permit(MODULES.NOTICES, 'update'), notices.update);
router.delete('/:id', permit(MODULES.NOTICES, 'delete'), notices.remove);

module.exports = router;