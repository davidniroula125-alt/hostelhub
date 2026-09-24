const Student = require('../models/Student');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
const Complaint = require('../models/Complaint');
const LeaveRequest = require('../models/LeaveRequest');
const Visitor = require('../models/Visitor');
const { Subscription } = require('../models/Subscription');
const SubscriptionPlan = require('../models/Subscription').SubscriptionPlan;
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const dateRangeFilter = (q) => {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
  const ranges = {
    today: () => ({ $gte: startOfDay(now), $lte: endOfDay(now) }),
    week: () => {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
      return { $gte: start, $lte: endOfDay(now) };
    },
    month: () => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { $gte: start, $lte: endOfDay(now) };
    },
    lastMonth: () => {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { $gte: start, $lte: endOfDay(end) };
    },
    year: () => {
      const start = new Date(now.getFullYear(), 0, 1);
      return { $gte: start, $lte: endOfDay(now) };
    }
  };
  if (ranges[q]) return ranges[q]();
  if (q === 'custom') {
    if (!this || !this.from || !this.to) return null;
    return { $gte: startOfDay(this.from), $lte: endOfDay(this.to) };
  }
  return { $gte: startOfDay(now), $lte: endOfDay(now) };
};

exports.dashboard = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const now = new Date();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  mEnd.setHours(23, 59, 59, 999);

  const [
    totalStudents, activeStudents, rooms, invoices, payments,
    expenses, complaints, leaves, visitors, pendingInvoices
  ] = await Promise.all([
    Student.countDocuments({ hostel: hostelId }),
    Student.countDocuments({ hostel: hostelId, status: { $in: ['active', 'notice'] } }),
    Room.find({ hostel: hostelId }),
    Invoice.find({ hostel: hostelId }),
    Payment.find({ hostel: hostelId }),
    Expense.find({ hostel: hostelId }),
    Complaint.countDocuments({ hostel: hostelId }),
    LeaveRequest.countDocuments({ hostel: hostelId }),
    Visitor.countDocuments({ hostel: hostelId }),
    Invoice.find({ hostel: hostelId, status: { $in: ['open', 'partial'] } })
  ]);

  let totalBeds = 0, occupiedBeds = 0, availableBeds = 0, maintenanceBeds = 0;
  rooms.forEach((r) => {
    r.beds.forEach((b) => {
      totalBeds += 1;
      if (b.status === 'occupied') occupiedBeds += 1;
      else if (b.status === 'maintenance') maintenanceBeds += 1;
      else availableBeds += 1;
    });
  });

  const monthPayments = payments.filter((p) => p.date >= mStart && p.date <= mEnd).reduce((s, p) => s + p.amount, 0);
  const monthExpenses = expenses.filter((e) => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + e.amount, 0);
  const totalPaid = payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalBilled = invoices.filter((i) => i.status !== 'void').reduce((s, i) => s + i.total, 0);
  const pendingAmount = pendingInvoices.reduce((s, i) => s + i.balance, 0);

  const subscription = await Subscription.findOne({ hostel: hostelId }).sort({ createdAt: -1 }).populate('plan');

  res.json({
    success: true,
    data: {
      stats: {
        totalStudents,
        activeStudents,
        totalRooms: rooms.length,
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        occupancyPercent: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        monthlyRentCollected: monthPayments,
        totalCollected: totalPaid,
        pendingPayments: pendingAmount,
        pendingInvoicesCount: pendingInvoices.length,
        totalExpenses: totalExpense,
        monthlyExpenses: monthExpenses,
        monthlyRevenue: monthPayments,
        netIncome: monthPayments - monthExpenses,
        totalBilled,
        openComplaints: await Complaint.countDocuments({ hostel: hostelId, status: { $in: ['open', 'in_progress'] } }),
        pendingLeaves: await LeaveRequest.countDocuments({ hostel: hostelId, status: 'pending' })
      },
      occupancy: {
        totalBeds,
        occupied: occupiedBeds,
        available: availableBeds,
        maintenance: maintenanceBeds,
        percent: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      },
      subscription: subscription || null,
      planLimits: subscription && subscription.plan ? subscription.plan : null
    }
  });
});

exports.trend = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const range = req.query.range || 'month';
  let from, to;
  const now = new Date();
  if (range === 'today') { from = new Date(now); from.setHours(0,0,0,0); to = new Date(now); }
  else if (range === 'week') { from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0); to = new Date(now); }
  else if (range === 'lastMonth') { from = new Date(now.getFullYear(), now.getMonth()-1, 1); to = new Date(now.getFullYear(), now.getMonth(), 0); to.setHours(23,59,59,999); }
  else if (range === 'year') { from = new Date(now.getFullYear(), 0, 1); to = new Date(now); }
  else { from = new Date(now.getFullYear(), now.getMonth(), 1); to = new Date(now.getFullYear(), now.getMonth()+1, 0); to.setHours(23,59,59,999); }

  const bucket = range === 'year' ? 'monthly' : 'daily';
  const fmt = range === 'year'
    ? (d) => d.toLocaleString('en-US', { month: 'short' })
    : (d) => d.toISOString().split('T')[0];

  const [payments, expenses, invoices] = await Promise.all([
    Payment.find({ hostel: hostelId, status: 'completed', date: { $gte: from, $lte: to } }),
    Expense.find({ hostel: hostelId, date: { $gte: from, $lte: to } }),
    Invoice.find({ hostel: hostelId, status: { $ne: 'void' }, invoiceDate: { $gte: from, $lte: to } })
  ]);

  const buckets = {};
  const add = (map, key, amt) => { map[key] = (map[key] || 0) + amt; };
  payments.forEach((p) => add(buckets, fmt(bucket === 'monthly' ? new Date(p.date) : new Date(p.date)), p.amount));
  expenses.forEach((e) => add(buckets, fmt(new Date(e.date)), e.amount));

  const points = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = fmt(cursor);
    const revenue = payments.filter((p) => fmt(new Date(p.date)) === key).reduce((s, p) => s + p.amount, 0);
    const exp = expenses.filter((e) => fmt(new Date(e.date)) === key).reduce((s, e) => s + e.amount, 0);
    const invoicesTotal = invoices.filter((i) => fmt(new Date(i.invoiceDate)) === key).reduce((s, i) => s + i.total, 0);
    const invInBucket = invoices.filter((i) => fmt(new Date(i.invoiceDate)) === key);
    const outstanding = invInBucket.reduce((s, i) => s + i.balance, 0);
    points.push({ label: key, revenue: Math.round(revenue), expenses: Math.round(exp), net: Math.round(revenue - exp), invoiced: Math.round(invoicesTotal), outstanding: Math.round(outstanding) });
    if (bucket === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  res.json({ success: true, data: points });
});

exports.activity = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);
  const logs = await AuditLog.find({ hostel: hostelId })
    .populate('user', 'name role')
    .sort('-createdAt')
    .limit(limit);
  const latestPayments = await Payment.find({ hostel: hostelId }).sort('-createdAt').limit(5).select('studentName amount method createdAt');
  const latestStudents = await Student.find({ hostel: hostelId }).sort('-createdAt').limit(5).select('name status createdAt');
  res.json({ success: true, data: { audit: logs, payments: latestPayments, students: latestStudents } });
});

exports.recentActivity = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const recent = await Promise.all([
    Student.find({ hostel: hostelId }).sort('-createdAt').limit(limit).select('name status createdAt'),
    Payment.find({ hostel: hostelId }).sort('-createdAt').limit(limit).select('studentName amount method createdAt'),
    Expense.find({ hostel: hostelId }).sort('-createdAt').limit(limit).select('title amount createdAt'),
    Complaint.find({ hostel: hostelId }).sort('-createdAt').limit(limit).select('title status createdAt'),
    Visitor.find({ hostel: hostelId }).sort('-createdAt').limit(limit).select('name entryTime')
  ]);
  const events = [];
  recent[0].forEach((s) => events.push({ type: 'student', sub: s.status === 'checkedout' ? 'checkout' : 'admission', text: s.status === 'checkedout' ? `${s.name} checked out` : `New student ${s.name}`, at: s.createdAt }));
  recent[1].forEach((p) => events.push({ type: 'payment', text: `Payment of Rs. ${p.amount} from ${p.studentName}`, at: p.createdAt }));
  recent[2].forEach((e) => events.push({ type: 'expense', text: `Expense: ${e.title} (Rs. ${e.amount})`, at: e.createdAt }));
  recent[3].forEach((c) => events.push({ type: 'complaint', text: `Complaint "${c.title}" created`, at: c.createdAt }));
  recent[4].forEach((v) => events.push({ type: 'visitor', text: `Visitor ${v.name} entered`, at: v.entryTime }));
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ success: true, data: events.slice(0, limit) });
});