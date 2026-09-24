const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const { FoodAssignment, FoodPlan } = require('../models/FoodPlan');
const { Utility, MeterReading } = require('../models/Utility');
const { getCounter } = require('./numberService');
const { notify } = require('./notificationService');
const { logAudit } = require('./auditService');
const AppError = require('../utils/AppError');

const invoiceStatusFrom = (paid, total) => {
  if (total <= 0) return 'paid';
  if (paid <= 0) return 'open';
  if (paid >= total) return 'paid';
  return 'partial';
};

const monthLabel = (d = new Date()) =>
  d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

const periodKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const buildStudentCharges = async (student, asOf = new Date(), session = null) => {
  const charges = [];
  const hostel = await Hostel.findById(student.hostel).select('settings').session(session);
  const prefix = hostel && hostel.settings ? hostel.settings.invoicePrefix : 'INV';

  charges.push({
    description: `Room Rent (${student.room ? 'Room' : '—'} / ${StudentRoomLabel(student)})`,
    type: 'rent',
    amount: student.monthlyRent || 0
  });

  const assignment = await FoodAssignment.findOne({ student: student._id, status: 'active' }).session(session).sort({ createdAt: -1 }).populate('plan');
  if (assignment && assignment.amount > 0) {
    charges.push({ description: `Mess / Food (${assignment.plan ? assignment.plan.name : 'Plan'})`, type: 'food', amount: assignment.amount });
  } else if (student.foodAmount > 0) {
    charges.push({ description: 'Mess / Food', type: 'food', amount: student.foodAmount });
  }

  const utilities = await Utility.find({ hostel: student.hostel, active: true, billingEnabled: true }).session(session);
  for (const u of utilities) {
    if (u.chargeType === 'metered') {
      const reading = await MeterReading.findOne({ hostel: student.hostel, student: student._id, utility: u._id, period: periodKey(asOf) }).session(session);
      if (reading && reading.total > 0) {
        charges.push({ description: `${u.name} (${reading.unitsUsed} ${u.unit} × ${reading.ratePerUnit})`, type: 'utility', amount: reading.total });
      }
    } else if (u.chargeType === 'perUsage') {
      const reading = await MeterReading.findOne({ hostel: student.hostel, student: student._id, utility: u._id, period: periodKey(asOf) }).session(session);
      const amt = reading && reading.total > 0 ? reading.total : u.amount;
      if (amt > 0) charges.push({ description: u.name, type: 'utility', amount: amt });
    } else {
      if (u.amount > 0) charges.push({ description: u.name, type: 'utility', amount: u.amount });
    }
  }
  return charges;
};

const StudentRoomLabel = (student) => {
  if (student.room) {
    return (student.room && student.room.roomNumber) || '';
  }
  return '';
};

const generateMonthlyInvoice = async ({ studentId, hostelId, periodDate = new Date(), asUserId, force = false, session = null }) => {
  const key = periodKey(periodDate);
  const student = await Student.findById(studentId).session(session).populate('room');
  if (!student) throw new Error('Student not found');
  if (student.status !== 'active' && student.status !== 'notice' && !force) return null;

  const existing = await Invoice.findOne({ hostel: hostelId, student: studentId, period: key, status: { $ne: 'void' } }).session(session);
  if (existing) return existing;

  const charges = await buildStudentCharges(student, periodDate, session);
  if (!charges.length) return null;

  const invoiceNumber = await getCounter(hostelId, 'invoice', session);
  const subtotal = charges.reduce((s, c) => s + c.amount, 0);

  const invoice = await Invoice.create([{
    hostel: hostelId,
    branch: student.branch,
    invoiceNumber,
    student: studentId,
    studentName: student.name,
    studentPhone: student.phone,
    room: student.room && student.room.roomNumber ? student.room.roomNumber : null,
    bed: student.bedLabel || null,
    invoiceDate: periodDate,
    dueDate: await defaultDueDate(hostelId, periodDate, session),
    period: key,
    items: charges,
    subtotal,
    discount: 0,
    additionalCharges: 0,
    total: subtotal,
    paid: 0,
    balance: subtotal,
    status: 'open',
    createdBy: asUserId || undefined
  }], session ? { session } : undefined);

  return invoice[0];
};

const defaultDueDate = async (hostelId, from = new Date(), session = null) => {
  const hotel = await Hostel.findById(hostelId).select('settings').session(session);
  const dueDay = hotel && hotel.settings && hotel.settings.dueDay ? hotel.settings.dueDay : 5;
  const d = new Date(from);
  d.setDate(dueDay);
  if (d < from) {
    d.setMonth(d.getMonth() + 1);
    d.setDate(dueDay);
  }
  d.setHours(23, 59, 59, 999);
  return d;
};

const generateMonthlyInvoices = async ({ hostelId, monthOffset = 0, asUserId }) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  const students = await Student.find({ hostel: hostelId, status: { $in: ['active', 'notice'] } });
  const created = [];
  for (const s of students) {
    const inv = await generateMonthlyInvoice({ studentId: s._id, hostelId, periodDate: d, asUserId });
    if (inv) created.push(inv);
  }
  return created;
};

const applyLateFees = async ({ hostelId, asUserId }) => {
  const hotel = await Hostel.findById(hostelId).select('settings');
  const lateFee = hotel && hotel.settings ? Number(hotel.settings.lateFee) || 0 : 0;
  if (!lateFee) return [];
  const today = new Date();
  const invoices = await Invoice.find({
    hostel: hostelId,
    status: { $in: ['open', 'partial'] },
    dueDate: { $lt: today }
  });
  const updated = [];
  for (const inv of invoices) {
    const already = inv.items.some((i) => i.type === 'late_fee_for_period');
    if (already) continue;
    inv.items.push({ description: `Late fee (${monthLabel()})`, type: 'late_fee', amount: lateFee });
    inv.subtotal += lateFee;
    inv.total += lateFee;
    inv.balance += lateFee;
    if (inv.balance < 0) inv.balance = 0;
    inv.status = invoiceStatusFrom(inv.paid, inv.total);
    await inv.save();
    updated.push(inv);
  }
  return updated;
};

const computeStudentBalances = async (studentId, session = null) => {
  const invoices = await Invoice.find({ student: studentId, status: { $in: ['open', 'partial'] } }).session(session);
  return invoices.reduce((s, i) => s + i.balance, 0);
};

const refreshStudentOutstanding = async (studentId, session = null) => {
  const bal = await computeStudentBalances(studentId, session);
  await Student.updateOne({ _id: studentId }, { $set: { outstandingBalance: bal } }).session(session);
  return bal;
};

const syncFoodChargeOnInvoice = async ({ studentId, hostelId, planName = null, amount = 0, asUserId = null }) => {
  if (!studentId) return null;
  const key = periodKey(new Date());
  const inv = await Invoice.findOne({ hostel: hostelId, student: studentId, period: key, status: { $nin: ['void'] } });
  if (!inv) return null;
  inv.items = (inv.items || []).filter((i) => i.type !== 'food');
  if (amount > 0) {
    inv.items.push({ description: planName ? `Mess / Food (${planName})` : 'Mess / Food', type: 'food', amount });
  }
  const subtotal = inv.items.reduce((s, i) => s + i.amount, 0);
  inv.discount = inv.discount || 0;
  inv.additionalCharges = inv.additionalCharges || 0;
  inv.subtotal = subtotal;
  inv.total = subtotal - inv.discount + inv.additionalCharges;
  inv.balance = Math.max(0, inv.total - (inv.paid || 0));
  inv.status = invoiceStatusFrom(inv.paid, inv.total);
  await inv.save();
  await refreshStudentOutstanding(studentId);
  return inv;
};

const recordPayment = async ({ studentId, hostelId, invoiceId = null, amount, method = 'cash', date = new Date(), transactionId, reference, notes, receivedBy, allowOverpay = false, gateway = 'manual' }) => {
  const student = await Student.findById(studentId).populate('room');
  if (!student) throw new AppError('Student not found', 404);
  if (student.status === 'checkedout') throw new AppError('Cannot record payment for a checked-out student', 400);

  const openInvoices = await Invoice.find({
    hostel: hostelId,
    student: studentId,
    status: { $in: ['open', 'partial'] }
  }).sort({ invoiceDate: 1 });

  let targetInvoices = [];
  if (invoiceId) {
    const inv = await Invoice.findOne({ _id: invoiceId, hostel: hostelId });
    if (!inv) throw new AppError('Invoice not found', 404);
    if (!['open', 'partial'].includes(inv.status)) throw new AppError('Invoice is not payable (already paid or void)', 400);
    if (amount > inv.balance && !allowOverpay) {
      throw new AppError(`Amount ${amount} exceeds invoice balance ${inv.balance}.`, 400);
    }
    targetInvoices = [inv];
  } else {
    targetInvoices = openInvoices;
  }

  let remaining = amount;
  const payments = [];
  for (const inv of targetInvoices) {
    if (remaining <= 0) break;
    const alloc = Math.min(remaining, inv.balance);
    remaining -= alloc;
    if (alloc <= 0) continue;

    const receiptNumber = await getCounter(hostelId, 'receipt');
    const payment = await Payment.create({
      hostel: hostelId,
      branch: student.branch,
      receiptNumber,
      student: studentId,
      studentName: student.name,
      invoice: inv._id,
      invoiceNumber: inv.invoiceNumber,
      amount: alloc,
      date,
      method,
      transactionId,
      reference,
      notes,
      receivedBy: receivedBy || undefined,
      receivedByName: receivedBy ? (await (require('../models/User')).findById(receivedBy).select('name')).name : null,
      gateway,
      previousBalance: inv.balance,
      remainingBalance: inv.balance - alloc,
      status: 'completed'
    });

    inv.paid = (inv.paid || 0) + alloc;
    inv.balance = Math.max(0, inv.balance - alloc);
    inv.status = invoiceStatusFrom(inv.paid, inv.total);
    await inv.save();
    payments.push(payment);
  }

  if (remaining > 0 && !allowOverpay) {
    throw new AppError('Payment exceeds total outstanding balance.', 400);
  }
  if (remaining > 0 && allowOverpay) {
    const receiptNumber = await getCounter(hostelId, 'receipt');
    const payment = await Payment.create({
      hostel: hostelId,
      student: studentId,
      receiptNumber,
      studentName: student.name,
      amount: remaining,
      date,
      method,
      transactionId,
      reference,
      notes,
      receivedBy: receivedBy || undefined,
      gateway,
      previousBalance: 0,
      remainingBalance: 0,
      status: 'completed'
    });
    payments.push(payment);
  }

  const balance = await refreshStudentOutstanding(studentId);
  return { payments: payments.map((p) => p.toObject()), balance };
};

const checkoutStudent = async ({ studentId, hostelId, damageDeduction = 0, otherDeduction = 0, reason = '', notes = '', asUserId, settledBy }) => {
  const student = await Student.findById(studentId).populate('room');
  if (!student) throw new Error('Student not found');
  if (student.status === 'checkedout') throw new Error('Student already checked out');

  const balance = await computeStudentBalances(studentId);
  const deposit = student.securityDeposit || 0;
  const deductions = (damageDeduction || 0) + (otherDeduction || 0);
  const refundable = Math.max(0, deposit - deductions - balance);

  const checkout = {
    date: new Date(),
    reason,
    outstandingRent: Math.max(0, balance),
    damageDeduction: damageDeduction || 0,
    otherDeduction: otherDeduction || 0,
    depositRefund: refundable,
    settledBy: settledBy || asUserId || undefined,
    notes
  };

  student.status = 'checkedout';
  student.checkout = checkout;
  student.deposit.refundStatus = refundable > 0 ? 'pending' : 'forfeited';
  student.deposit.refundAmount = refundable;
  student.deposit.deduction = deductions;

  if (student.room && student.bed) {
    const Room = require('../models/Room');
    const updateRoomStatus = Room.updateRoomStatus;
    const room = await Room.findOne({ _id: student.room, hostel: hostelId });
    if (room) {
      const bedIdx = room.beds.findIndex((b) => String(b._id) === String(student.bed));
      if (bedIdx >= 0) {
        const bed = room.beds[bedIdx];
        bed.status = 'available';
        if (bed.history) {
          bed.history.push({ student: studentId, studentName: student.name, status: 'occupied', from: bed.assignedAt || room.createdAt, to: new Date() });
        }
        bed.student = null;
        bed.studentName = null;
        bed.assignedAt = null;
        const newStatus = updateRoomStatus(room.beds);
        room.status = newStatus;
        room.markModified('beds');
        await room.save();
      }
    }
    student.room = null;
    student.bed = null;
    student.bedLabel = null;
  }

  await student.save();

  await notify({
    hostel: hostelId,
    type: 'checkout',
    title: 'Student checkout',
    message: `${student.name} checked out on ${new Date().toLocaleDateString('en-CA')}`
  });

  return student;
};

const settleRefund = async ({ studentId, amount = null, date = new Date(), notes = '', asUserId }) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');
  const refund = amount !== null ? amount : (student.deposit.refundAmount || 0);
  student.deposit.refundAmount = refund;
  student.deposit.refundDate = date;
  student.deposit.refundStatus = 'refunded';
  student.deposit.notes = notes;
  await student.save();
  return student;
};

module.exports = {
  buildStudentCharges,
  generateMonthlyInvoice,
  generateMonthlyInvoices,
  applyLateFees,
  recordPayment,
  checkoutStudent,
  settleRefund,
  refreshStudentOutstanding,
  syncFoodChargeOnInvoice,
  computeStudentBalances,
  monthLabel,
  periodKey
};