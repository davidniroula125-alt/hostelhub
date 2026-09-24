const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const complaints = require('../controllers/complaintController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.COMPLAINTS, 'read'), complaints.list);
router.post('/', permit(MODULES.COMPLAINTS, 'create'), complaints.create);
router.get('/:id', permit(MODULES.COMPLAINTS, 'read'), complaints.get);
router.put('/:id', permit(MODULES.COMPLAINTS, 'update'), complaints.update);
router.post('/:id/resolve', permit(MODULES.COMPLAINTS, 'update'), complaints.resolve);
router.delete('/:id', permit(MODULES.COMPLAINTS, 'delete'), complaints.remove);

module.exports = router;