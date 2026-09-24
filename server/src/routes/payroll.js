const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const payroll = require('../controllers/payrollController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.PAYROLL, 'read'), payroll.list);
router.post('/', permit(MODULES.PAYROLL, 'create'), payroll.create);
router.post('/generate', permit(MODULES.PAYROLL, 'create'), payroll.generateMonth);
router.get('/:id', permit(MODULES.PAYROLL, 'read'), payroll.get);
router.put('/:id', permit(MODULES.PAYROLL, 'update'), payroll.update);
router.post('/:id/pay', permit(MODULES.PAYROLL, 'update'), payroll.pay);
router.delete('/:id', permit(MODULES.PAYROLL, 'delete'), payroll.remove);

module.exports = router;