const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');
const { notify } = require('../services/notificationService');
const { getCounter } = require('../services/numberService');
const {
  generateMonthlyInvoice,
  generateMonthlyInvoices,
  applyLateFees,
  recordPayment,
  checkoutStudent,
  settleRefund,
  buildStudentCharges
} = require('../services/billingService');

exports.listInvoices = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.q) {
    const rx = { $regex: String(req.query.q), $options: 'i' };
    filter.$or = [{ invoiceNumber: rx }, { studentName: rx }];
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const [total, data] = await Promise.all([
    Invoice.countDocuments(filter),
    Invoice.find(filter)
      .populate({ path: 'student', select: 'name room bedLabel' })
      .sort(req.query.sort || '-invoiceDate')
      .skip((page - 1) * limit)
      .limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.getInvoice = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, hostel: req.user.hostel })
    .populate({ path: 'student', select: 'name phone room bedLabel admissionDate' });
  if (!invoice) return next(new AppError('Invoice not found', 404));
  const payments = await Payment.find({ invoice: invoice._id });
  res.json({ success: true, data: { ...invoice.toObject(), payments } });
});

exports.createInvoice = catchAsync(async (req, res, next) => {
  const { studentId, items, discount = 0, additionalCharges = 0, dueDate, invoiceDate, period, lateFee = 0 } = req.body;
  const student = await Student.findOne({ _id: studentId, hostel: req.user.hostel });
  if (!student) return next(new AppError('Student not found', 404));

  const normalized = (items || []).map((i) => ({ description: i.description, type: i.type || 'other', amount: Number(i.amount) || 0 }));
  const subtotal = normalized.reduce((s, i) => s + i.amount, 0);
  const total = subtotal - (Number(discount) || 0) + (Number(additionalCharges) || 0) + (Number(lateFee) || 0);
  if (total < 0) return next(new AppError('Invoice total cannot be negative', 400));

  const invoiceNumber = await getCounter(req.user.hostel, 'invoice');
  const invoice = await Invoice.create({
    hostel: req.user.hostel,
    branch: student.branch,
    invoiceNumber,
    student: student._id,
    studentName: student.name,
    studentPhone: student.phone,
    room: student.room ? (await require('../models/Room').findById(student.room))?.roomNumber : null,
    bed: student.bedLabel,
    invoiceDate: invoiceDate || new Date(),
    dueDate: dueDate || new Date(),
    period,
    items: normalized,
    subtotal,
    discount: Number(discount) || 0,
    additionalCharges: Number(additionalCharges) || 0,
    total,
    paid: 0,
    balance: total,
    status: 'open',
    lateFee: Number(lateFee) || 0,
    createdBy: req.user._id
  });
  await logAudit({ req, action: 'CREATE_INVOICE', module: 'invoices', recordId: invoice._id, description: `Invoice ${invoice.invoiceNumber} for ${student.name}` });
  res.status(201).json({ success: true, message: 'Invoice created', data: invoice });
});

exports.generateMonthly = catchAsync(async (req, res, next) => {
  const { monthOffset = 0 } = req.body;
  const created = await generateMonthlyInvoices({ hostelId: req.user.hostel, monthOffset: Number(monthOffset), asUserId: req.user._id });
  const feeApplied = await applyLateFees({ hostelId: req.user.hostel, asUserId: req.user._id });
  await logAudit({ req, action: 'GENERATE_INVOICES', module: 'invoices', description: `Generated ${created.length} monthly invoices` });
  res.json({ success: true, message: `${created.length} invoices generated${feeApplied.length ? `, ${feeApplied.length} late fees applied` : ''}`, data: { created: created.length, lateFees: feeApplied.length } });
});

exports.voidInvoice = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, hostel: req.user.hostel });
  if (!invoice) return next(new AppError('Invoice not found', 404));
  if (invoice.paid > 0) return next(new AppError('Cannot void an invoice with payments. Refund/void payments first.', 409));
  invoice.status = 'void';
  invoice.voidReason = req.body.reason || 'Voided manually';
  await invoice.save();
  await logAudit({ req, action: 'VOID_INVOICE', module: 'invoices', recordId: invoice._id, description: `Invoice ${invoice.invoiceNumber} voided` });
  res.json({ success: true, message: 'Invoice voided', data: invoice });
});

exports.listPayments = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.student) filter.student = req.query.student;
  if (req.query.method && req.query.method !== 'all') filter.method = req.query.method;
  if (req.query.invoice) filter.invoice = req.query.invoice;
  if (req.query.q) {
    const rx = { $regex: String(req.query.q), $options: 'i' };
    filter.$or = [{ receiptNumber: rx }, { studentName: rx }, { transactionId: rx }];
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const [total, data] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.find(filter)
      .populate({ path: 'student', select: 'name room bedLabel' })
      .populate({ path: 'invoice', select: 'invoiceNumber' })
      .sort(req.query.sort || '-date')
      .skip((page - 1) * limit)
      .limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.getPayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findOne({ _id: req.params.id, hostel: req.user.hostel })
    .populate({ path: 'student', select: 'name phone room bedLabel' })
    .populate({ path: 'invoice', select: 'invoiceNumber total paid balance' })
    .populate('receivedBy', 'name');
  if (!payment) return next(new AppError('Payment not found', 404));
  res.json({ success: true, data: payment });
});

exports.recordPayment = catchAsync(async (req, res, next) => {
  const { studentId, invoiceId, amount, method = 'cash', date, transactionId, reference, notes } = req.body;
  if (!studentId) return next(new AppError('studentId is required', 400));
  const amt = Number(amount);
  if (!amt || amt <= 0) return next(new AppError('Valid positive amount is required', 400));

  const result = await recordPayment({
    studentId,
    hostelId: req.user.hostel,
    invoiceId: invoiceId || null,
    amount: amt,
    method,
    date: date || new Date(),
    transactionId,
    reference,
    notes,
    receivedBy: req.user._id
  });

  const { payments } = result;
  const student = await Student.findById(studentId);
  await logAudit({ req, action: 'RECORD_PAYMENT', module: 'payments', recordId: studentId, description: `Payment of ${amt} recorded for ${student ? student.name : studentId}` });
  await notify({
    hostel: req.user.hostel,
    student: studentId,
    user: student.user || undefined,
    type: 'payment',
    title: 'Payment received',
    message: `Payment of Rs. ${amt.toLocaleString('en-IN')} received from ${student ? student.name : ''}`
  });
  if (student) {
    const { sendMail } = require('../utils/email');
    if (student.email) await sendMail(student.email, 'receipt', { name: student.name, number: payments.map((p) => p.receiptNumber).join(', '), amount: `Rs. ${amt.toLocaleString('en-IN')}`, date: new Date().toLocaleDateString('en-CA'), balance: `Rs. ${student.outstandingBalance.toLocaleString('en-IN')}` });
  }

  res.status(201).json({ success: true, message: 'Payment recorded successfully', data: { payments, student, balance: result.balance } });
});

exports.checkout = catchAsync(async (req, res, next) => {
  const { studentId, damageDeduction = 0, otherDeduction = 0, reason = '', notes = '' } = req.body;
  if (!studentId) return next(new AppError('studentId is required', 400));
  const student = await checkoutStudent({
    studentId,
    hostelId: req.user.hostel,
    damageDeduction: Number(damageDeduction) || 0,
    otherDeduction: Number(otherDeduction) || 0,
    reason,
    notes,
    asUserId: req.user._id
  });
  await logAudit({ req, action: 'CHECKOUT', module: 'students', recordId: studentId, description: `Checked out ${student.name}` });
  res.json({ success: true, message: `${student.name} checked out. Bed released.`, data: student });
});

exports.settleRefund = catchAsync(async (req, res, next) => {
  const { studentId, amount, date, notes } = req.body;
  const student = await settleRefund({ studentId, amount, date, notes, asUserId: req.user._id });
  await logAudit({ req, action: 'SETTLE_REFUND', module: 'deposits', recordId: studentId, description: `Deposit refund of ${amount} settled for ${student.name}` });
  res.json({ success: true, message: 'Deposit refund settled', data: student });
});

exports.updateDeposit = catchAsync(async (req, res, next) => {
  const { studentId, amount, date, method, refundAmount, deduction, refundDate, refundStatus, notes } = req.body;
  const student = await Student.findOne({ _id: studentId, hostel: req.user.hostel });
  if (!student) return next(new AppError('Student not found', 404));
  student.deposit = {
    ...student.deposit,
    ...(amount !== undefined ? { amount } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(method !== undefined ? { method } : {}),
    ...(refundAmount !== undefined ? { refundAmount } : {}),
    ...(deduction !== undefined ? { deduction } : {}),
    ...(refundDate !== undefined ? { refundDate } : {}),
    ...(refundStatus !== undefined ? { refundStatus } : {}),
    ...(notes !== undefined ? { notes } : {})
  };
  await student.save();
  await logAudit({ req, action: 'UPDATE_DEPOSIT', module: 'deposits', recordId: studentId, description: `Deposit updated for ${student.name}` });
  res.json({ success: true, message: 'Deposit updated', data: student });
});

exports.previewCheckout = catchAsync(async (req, res, next) => {
  const { studentId, damageDeduction = 0, otherDeduction = 0 } = req.params.studentId ? {} : req.body;
  const sid = req.body.studentId || req.params.studentId;
  const student = await Student.findOne({ _id: sid, hostel: req.user.hostel }).populate('room');
  if (!student) return next(new AppError('Student not found', 404));
  const { computeStudentBalances } = require('../services/billingService');
  const balance = await computeStudentBalances(sid);
  const deposit = student.securityDeposit || 0;
  const deductions = Number(damageDeduction) + Number(otherDeduction);
  const refundable = Math.max(0, deposit - deductions - balance);
  const openInvoices = await Invoice.find({ student: sid, status: { $in: ['open', 'partial'] } });
  res.json({
    success: true,
    data: {
      student: { name: student.name, room: student.room ? student.room.roomNumber : null, bed: student.bedLabel, admissionDate: student.admissionDate },
      outstandingBalance: balance,
      securityDeposit: deposit,
      damageDeduction: Number(damageDeduction),
      otherDeduction: Number(otherDeduction),
      totalDeductions: deductions,
      refundableAmount: refundable,
      openInvoices: openInvoices.map((i) => ({ invoiceNumber: i.invoiceNumber, total: i.total, balance: i.balance, dueDate: i.dueDate }))
    }
  });
});

exports.previewCharges = catchAsync(async (req, res, next) => {
  const { studentId } = req.params;
  const student = await Student.findOne({ _id: studentId, hostel: req.user.hostel });
  if (!student) return next(new AppError('Student not found', 404));
  const asOf = req.query.period ? new Date(`${req.query.period}-01T00:00:00`) : new Date();
  const charges = await buildStudentCharges(student, asOf);
  res.json({ success: true, data: charges });
});