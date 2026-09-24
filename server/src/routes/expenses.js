const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const expenses = require('../controllers/expenseController');
const { makeUploader } = require('../middleware/upload');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.EXPENSES, 'read'), expenses.list);
router.post('/', permit(MODULES.EXPENSES, 'create'), expenses.create);
router.get('/:id', permit(MODULES.EXPENSES, 'read'), expenses.get);
router.put('/:id', permit(MODULES.EXPENSES, 'update'), expenses.update);
router.delete('/:id', permit(MODULES.EXPENSES, 'delete'), expenses.remove);
router.post('/:id/receipt', permit(MODULES.EXPENSES, 'update'), makeUploader({ allow: 'document', fieldName: 'file', kind: 'expenses' }), expenses.receipt);

module.exports = router;