const Student = require('../models/Student');
const Room = require('../models/Room');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Attendance = require('../models/Attendance');
const StaffAttendance = require('../models/StaffAttendance');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendCSV, sendXLSX } = require('../utils/exportUtil');

const parseRange = (req) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(0);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (from > to) throw new AppError('From date must be before To date', 400);
  return { from, to, filter: { $gte: from, $lte: to } };
};

const respond = (res, rows, columns) => {
  if (res.req.query.export === 'xlsx') return sendXLSX(res, rows, columns, res.req.query.filename || 'report');
  if (res.req.query.export === 'csv') return sendCSV(res, rows, columns, res.req.query.filename || 'report');
  res.json({ success: true, data: rows });
};

exports.students = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const { from, to, filter } = parseRange(req);
  const type = req.query.type || 'active';
  const q = { hostel: hostelId };

  let rows;
  if (type === 'admissions') {
    q.admissionDate = filter;
    const students = await Student.find(q).select('name college course admissionDate monthlyRent status createdBy');
    rows = students;
  } else if (type === 'checkouts') {
    q.status = 'checkedout';
    q['checkout.date'] = filter;
    const students = await Student.find(q).select('name admissionDate checkout status');
    rows = students.map((s) => ({ name: s.name, admissionDate: s.admissionDate, checkoutDate: s.checkout && s.checkout.date, depositRefund: s.checkout && s.checkout.depositRefund, status: s.status }));
  } else if (type === 'demographics') {
    const active = await Student.find({ hostel: hostelId, status: { $in: ['active', 'notice'] } });
    const byGender = {};
    active.forEach((s) => { byGender[s.gender] = (byGender[s.gender] || 0) + 1; });
    const byCollege = {};
    active.forEach((s) => { const c = s.college || 'Unknown'; byCollege[c] = (byCollege[c] || 0) + 1; });
    rows = [
      { metric: 'Total active', value: active.length },
      ...Object.entries(byGender).map(([k, v]) => ({ metric: `Gender: ${k}`, value: v })),
      { metric: '---', value: '---' },
      ...Object.entries(byCollege).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ metric: `College: ${k}`, value: v }))
    ];
    return respond(res, rows, [{ label: 'Metric', value: (r) => r.metric }, { label: 'Count', value: (r) => r.value }]);
  } else {
    q.status = { $in: ['active', 'notice'] };
    const students = await Student.find(q).select('name gender phone room monthlyRent status admissionDate college');
    rows = students;
  }
  respond(res, rows, [
    { label: 'Name', value: (r) => r.name },
    { label: 'Gender', value: (r) => r.gender },
    { label: 'Phone', value: (r) => r.phone },
    { label: 'College', value: (r) => r.college },
    { label: 'Monthly rent', value: (r) => r.monthlyRent },
    { label: 'Status', value: (r) => r.status },
    { label: 'Admission', value: (r) => (r.admissionDate || '').toISOString().split('T')[0] }
  ]);
});

exports.occupancy = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const rooms = await Room.find({ hostel: hostelId }).sort('floor roomNumber');
  const rows = rooms.map((r) => {
    const total = r.beds.length;
    const occupied = r.beds.filter((b) => b.status === 'occupied').length;
    const available = r.beds.filter((b) => b.status === 'available').length;
    const maintenance = r.beds.filter((b) => b.status === 'maintenance').length;
    const reserved = r.beds.filter((b) => b.status === 'reserved').length;
    return { roomNumber: r.roomNumber, floor: r.floor, roomType: r.roomType, total, occupied, available, reserved, maintenance, status: r.status, percent: total ? Math.round((occupied / total) * 100) : 0 };
  });
  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total; acc.occupied += r.occupied; acc.available += r.available; acc.maintenance += r.maintenance; acc.reserved += r.reserved;
      return acc;
    },
    { total: 0, occupied: 0, available: 0, maintenance: 0, reserved: 0 }
  );
  totals.roomNumber = 'TOTAL';
  totals.percent = totals.total ? Math.round((totals.occupied / totals.total) * 100) : 0;
  respond(res, [...rows, totals], [
    { label: 'Room', value: (r) => r.roomNumber },
    { label: 'Floor', value: (r) => r.floor },
    { label: 'Type', value: (r) => r.roomType },
    { label: 'Beds', value: (r) => r.total },
    { label: 'Occupied', value: (r) => r.occupied },
    { label: 'Available', value: (r) => r.available },
    { label: 'Reserved', value: (r) => r.reserved },
    { label: 'Maintenance', value: (r) => r.maintenance },
    { label: 'Percent', value: (r) => `${r.percent}%` }
  ]);
});

exports.financial = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const { from, to, filter } = parseRange(req);

  const [payments, expenses, invoices, refunds] = await Promise.all([
    Payment.find({ hostel: hostelId, status: 'completed', date: filter }),
    Expense.find({ hostel: hostelId, date: filter }),
    Invoice.find({ hostel: hostelId, status: { $ne: 'void' }, invoiceDate: filter }),
    Payment.find({ hostel: hostelId, status: 'refunded', date: filter })
  ]);

  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const refundTotal = refunds.reduce((s, p) => s + p.amount, 0);
  const net = revenue - expenseTotal - refundTotal;

  res.json({
    success: true,
    data: {
      from, to,
      summary: {
        revenue: Math.round(revenue),
        expenses: Math.round(expenseTotal),
        billed: Math.round(billed),
        outstanding: Math.round(outstanding),
        refunds: Math.round(refundTotal),
        netProfit: Math.round(net),
        collectionsRate: billed ? Math.round((Math.min(revenue, billed) / billed) * 100) : 0,
        paymentCount: payments.length,
        expenseCount: expenses.length
      },
      payments,
      expenses,
      byMethod: payments.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + p.amount; return acc; }, {})
    }
  });
});

exports.expenses = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const { from, to, filter } = parseRange(req);
  const expenses = await Expense.find({ hostel: hostelId, date: filter });
  const groupBy = req.query.groupBy || 'category';

  let rows;
  if (groupBy === 'monthly') {
    const map = {};
    expenses.forEach((e) => {
      const k = e.date.toISOString().slice(0, 7);
      map[k] = (map[k] || 0) + e.amount;
    });
    rows = Object.entries(map).map(([month, amount]) => ({ month, amount }));
  } else if (groupBy === 'vendor') {
    const map = {};
    expenses.forEach((e) => {
      const k = e.vendor || 'Other';
      map[k] = (map[k] || 0) + e.amount;
    });
    rows = Object.entries(map).map(([vendor, amount]) => ({ vendor, amount }));
  } else {
    const map = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    rows = Object.entries(map).map(([category, amount]) => ({ category, amount }));
  }
  rows.sort((a, b) => b.amount - a.amount);
  const cols = groupBy === 'monthly'
    ? [{ label: 'Month', value: (r) => r.month }, { label: 'Amount', value: (r) => r.amount }]
    : (groupBy === 'vendor'
      ? [{ label: 'Vendor', value: (r) => r.vendor }, { label: 'Amount', value: (r) => r.amount }]
      : [{ label: 'Category', value: (r) => r.category }, { label: 'Amount', value: (r) => r.amount }]);
  respond(res, rows, cols);
});

exports.rent = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const status = req.query.status || 'all';
  const filter = { hostel: hostelId, status: { $ne: 'void' } };
  if (req.query.period) filter.period = req.query.period;
  if (status !== 'all') {
    if (status === 'overdue') {
      filter.status = { $in: ['open', 'partial'] };
      filter.dueDate = { $lt: new Date() };
    } else {
      filter.status = status;
    }
  }
  const invoices = await Invoice.find(filter).select('invoiceNumber studentName room bed period invoiceDate dueDate total paid balance status lateFee');
  const rows = invoices.map((i) => ({
    invoiceNumber: i.invoiceNumber, studentName: i.studentName, room: i.room, period: i.period,
    invoiceDate: i.invoiceDate.toISOString().split('T')[0],
    dueDate: i.dueDate ? i.dueDate.toISOString().split('T')[0] : '',
    total: i.total, paid: i.paid, balance: i.balance, status: i.status
  }));
  respond(res, rows, [
    { label: 'Invoice', value: (r) => r.invoiceNumber },
    { label: 'Student', value: (r) => r.studentName },
    { label: 'Room', value: (r) => r.room },
    { label: 'Period', value: (r) => r.period },
    { label: 'Due date', value: (r) => r.dueDate },
    { label: 'Total', value: (r) => r.total },
    { label: 'Paid', value: (r) => r.paid },
    { label: 'Balance', value: (r) => r.balance },
    { label: 'Status', value: (r) => r.status }
  ]);
});

exports.studentAttendance = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const { from, to, filter } = parseRange(req);
  const records = await Attendance.find({ hostel: hostelId, date: filter }).populate('student', 'name room bedLabel');
  const map = {};
  records.forEach((r) => {
    const sid = String(r.student._id);
    if (!map[sid]) map[sid] = { student: r.student.name, room: r.student.room, present: 0, absent: 0, leave: 0, late: 0, total: 0 };
    map[sid][r.status] += 1;
    map[sid].total += 1;
  });
  const rows = Object.values(map).map((r) => ({ ...r, percent: r.total ? Math.round(((r.present + r.late) / r.total) * 100) : 0 }));
  respond(res, rows, [
    { label: 'Student', value: (r) => r.student },
    { label: 'Room', value: (r) => r.room },
    { label: 'Present', value: (r) => r.present },
    { label: 'Late', value: (r) => r.late },
    { label: 'Absent', value: (r) => r.absent },
    { label: 'Leave', value: (r) => r.leave },
    { label: '%', value: (r) => r.percent }
  ]);
});

exports.staffAttendance = catchAsync(async (req, res, next) => {
  const hostelId = req.user.hostel;
  const { from, to, filter } = parseRange(req);
  const records = await StaffAttendance.find({ hostel: hostelId, date: filter }).populate('staff', 'name position');
  const map = {};
  records.forEach((r) => {
    const sid = String(r.staff._id);
    if (!map[sid]) map[sid] = { staff: r.staff.name, position: r.staff.position, present: 0, absent: 0, leave: 0, late: 0, total: 0 };
    map[sid][r.status] += 1;
    map[sid].total += 1;
  });
  const rows = Object.values(map).map((r) => ({ ...r, percent: r.total ? Math.round(((r.present + r.late) / r.total) * 100) : 0 }));
  respond(res, rows, [
    { label: 'Staff', value: (r) => r.staff },
    { label: 'Position', value: (r) => r.position },
    { label: 'Present', value: (r) => r.present },
    { label: 'Late', value: (r) => r.late },
    { label: 'Absent', value: (r) => r.absent },
    { label: 'Leave', value: (r) => r.leave },
    { label: '%', value: (r) => r.percent }
  ]);
});