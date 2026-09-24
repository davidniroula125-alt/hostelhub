const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const billing = require('../controllers/billingController');

router.use(protect, requireHostel);

router.get('/invoices', permit(MODULES.INVOICES, 'read'), billing.listInvoices);
router.post('/invoices', permit(MODULES.INVOICES, 'create'), billing.createInvoice);
router.get('/invoices/:id', permit(MODULES.INVOICES, 'read'), billing.getInvoice);
router.post('/invoices/:id/void', permit(MODULES.INVOICES, 'update'), billing.voidInvoice);
router.post('/invoices/generate-monthly', permit(MODULES.BILLING, 'create'), billing.generateMonthly);

router.get('/payments', permit(MODULES.PAYMENTS, 'read'), billing.listPayments);
router.get('/payments/:id', permit(MODULES.PAYMENTS, 'read'), billing.getPayment);
router.post('/payments', permit(MODULES.PAYMENTS, 'create'), billing.recordPayment);

router.post('/checkout/preview', permit(MODULES.CHECKOUT, 'read'), billing.previewCheckout);
router.post('/checkout', permit(MODULES.CHECKOUT, 'update'), billing.checkout);
router.post('/deposits', permit(MODULES.STUDENTS, 'update'), billing.updateDeposit);
router.post('/deposits/refund', permit(MODULES.CHECKOUT, 'update'), billing.settleRefund);
router.get('/charges/:studentId', permit(MODULES.BILLING, 'read'), billing.previewCharges);

module.exports = router;