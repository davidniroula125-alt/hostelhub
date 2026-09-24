const Salary = require('../models/Salary');
const Staff = require('../models/Staff');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');

factory.setModel(Salary);

const currentMonth = () => new Date().toISOString().slice(0, 7);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    population: [{ path: 'staff', select: 'name position' }],
    sort: '-createdAt',
    listFilter: (req) => {
      const f = {};
      if (req.query.month) f.month = req.query.month;
      if (req.query.status && req.query.status !== 'all') f.status = req.query.status;
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }), population: [{ path: 'staff', select: 'name position salary' }] }),
  generateMonth: catchAsync(async (req, res, next) => {
    const { month = currentMonth() } = req.body;
    const staff = await Staff.find({ hostel: req.user.hostel, status: 'active' });
    const created = [];
    for (const s of staff) {
      const existing = await Salary.findOne({ hostel: req.user.hostel, staff: s._id, month });
      if (existing) continue;
      const salary = await Salary.create({
        hostel: req.user.hostel,
        staff: s._id,
        staffName: s.name,
        month,
        basicSalary: s.salary || 0,
        allowance: 0,
        bonus: 0,
        deduction: 0,
        advance: 0,
        netSalary: s.salary || 0,
        status: 'pending'
      });
      created.push(salary);
    }
    await logAudit({ req, action: 'GENERATE_PAYROLL', module: 'payroll', description: `Generated ${created.length} salaries for ${month}` });
    res.json({ success: true, message: `${created.length} salary records generated for ${month}`, data: { generated: created.length } });
  }),
  create: catchAsync(async (req, res, next) => {
    const body = req.body;
    const staff = await Staff.findOne({ _id: body.staff, hostel: req.user.hostel });
    if (!staff) return next(new AppError('Staff not found', 404));
    const basic = Number(body.basicSalary) || 0;
    const allowance = Number(body.allowance) || 0;
    const bonus = Number(body.bonus) || 0;
    const deduction = Number(body.deduction) || 0;
    const advance = Number(body.advance) || 0;
    const salary = await Salary.create({
      hostel: req.user.hostel,
      staff: staff._id,
      staffName: staff.name,
      month: body.month,
      basicSalary: basic,
      allowance,
      bonus,
      deduction,
      advance,
      netSalary: basic + allowance + bonus - deduction - advance,
      payDate: body.payDate,
      method: body.method || 'cash',
      status: body.status || 'pending',
      notes: body.notes
    });
    await logAudit({ req, action: 'CREATE_SALARY', module: 'payroll', recordId: salary._id, description: `Salary for ${staff.name} (${salary.month})` });
    res.status(201).json({ success: true, message: 'Salary record created', data: salary });
  }),
  update: catchAsync(async (req, res, next) => {
    const salary = await Salary.findOne({ _id: req.params.id, hostel: req.user.hostel });
    if (!salary) return next(new AppError('Salary record not found', 404));
    const { basicSalary, allowance, bonus, deduction, advance, method, payDate, status, notes, staffName } = req.body;
    if (basicSalary !== undefined) salary.basicSalary = basicSalary;
    if (allowance !== undefined) salary.allowance = allowance;
    if (bonus !== undefined) salary.bonus = bonus;
    if (deduction !== undefined) salary.deduction = deduction;
    if (advance !== undefined) salary.advance = advance;
    if (staffName !== undefined) salary.staffName = staffName;
    if (method !== undefined) salary.method = method;
    if (payDate !== undefined) salary.payDate = payDate;
    if (status !== undefined) salary.status = status;
    if (notes !== undefined) salary.notes = notes;
    salary.netSalary = salary.basicSalary + salary.allowance + salary.bonus - salary.deduction - salary.advance;
    await salary.save();
    await logAudit({ req, action: 'UPDATE_SALARY', module: 'payroll', recordId: salary._id, description: 'Salary updated' });
    res.json({ success: true, message: 'Salary updated', data: salary });
  }),
  pay: catchAsync(async (req, res, next) => {
    const salary = await Salary.findOneAndUpdate(
      { _id: req.params.id, hostel: req.user.hostel },
      { $set: { status: 'paid', payDate: new Date(), method: req.body.method || 'cash' } },
      { new: true }
    );
    if (!salary) return next(new AppError('Salary record not found', 404));
    await logAudit({ req, action: 'PAY_SALARY', module: 'payroll', recordId: salary._id, description: `Paid salary ${salary.netSalary} to ${salary.staffName}` });
    res.json({ success: true, message: 'Salary marked as paid', data: salary });
  }),
  remove: factory.remove({ audit: { action: 'DELETE_SALARY', module: 'payroll' } })
};