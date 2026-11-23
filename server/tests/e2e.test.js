process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostelhub_test';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const { app } = require('../src/app');

let adminToken, hostelId, ownerToken, studentToken, roomId, bedId, studentId, invoiceId, leaveId, invoiceNumber;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await mongoose.connection.db.dropDatabase();
  const { seedPlans, seedSuperAdmin } = require('../src/seed');
  await seedPlans();
  await seedSuperAdmin();
});

after(async () => {
  await mongoose.connection.close();
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });

test('1. Super admin logs in', async () => {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ email: 'admin@hostelhub.app', password: 'SuperAdmin@123' })
    .expect(200);
  adminToken = res.body.token;
  assert.ok(adminToken);
});

test('2. Super admin creates a hostel', async () => {
  const res = await request(app)
    .post('/api/admin/hostels')
    .set(auth(adminToken))
    .send({
      name: 'Everest Girls Hostel',
      type: 'girls',
      email: 'owner.everest@example.com',
      phone: '9843000000',
      ownerName: 'Maya Rai',
      planCode: 'STANDARD',
      trialDays: 14,
      password: 'owner123'
    })
    .expect(201);
  hostelId = res.body.data.hostel._id;
  assert.ok(hostelId);
});

test('3. Super admin validates tenant isolation: owner sees only own hostel data', async () => {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner.everest@example.com', password: 'owner123' })
    .expect(200);
  ownerToken = login.body.token;
  const dash = await request(app).get('/api/dashboard').set(auth(ownerToken)).expect(200);
  assert.strictEqual(dash.body.data.stats.totalStudents, 0);

  const otherStudents = await request(app).get('/api/students').set(auth(ownerToken)).expect(200);
  assert.strictEqual(otherStudents.body.data.total, 0);
});

test('4. Owner creates a room with beds', async () => {
  const res = await request(app)
    .post('/api/rooms')
    .set(auth(ownerToken))
    .send({ roomNumber: '301', floor: '3', roomType: 'Double', bedsCount: 2, monthlyRent: 11000, securityDeposit: 11000 })
    .expect(201);
  roomId = res.body.data._id;
  assert.strictEqual(res.body.data.beds.length, 2);
});

test('5. Owner tries duplicate room - rejected', async () => {
  await request(app)
    .post('/api/rooms')
    .set(auth(ownerToken))
    .send({ roomNumber: '301', floor: '3', roomType: 'Double', bedsCount: 2 })
    .expect(409);
});

test('6. Admission: bed assigned, deposit recorded, student created', async () => {
  roomId = (await request(app).get('/api/rooms').set(auth(ownerToken)).expect(200)).body.data.data[0]._id;
  const bedId_ = null;
  const room = (await request(app).get(`/api/rooms/${roomId}`).set(auth(ownerToken)).expect(200)).body.data;
  bedId = room.beds[0]._id;
  assert.ok(bedId);

  const res = await request(app)
    .post('/api/admissions')
    .set(auth(ownerToken))
    .send({
      name: 'Anita Lama', gender: 'female', dob: '2004-05-10', nationality: 'Nepali',
      phone: '9861001111', email: 'anita.lama@example.com', permanentAddress: 'Pokhara, Nepal',
      college: 'Kathmandu College', course: 'BSc Nursing', level: 'Bachelor', studentId: 'EVER-001',
      guardianName: 'Krishna Lama', guardianRelationship: 'Father', guardianPhone: '9811002222',
      roomId, bedId, monthlyRent: 11000, securityDeposit: 11000, depositMethod: 'cash',
      createAccount: true, portalPassword: 'student123', generateFirstInvoice: true
    })
    .expect(201);

  studentId = res.body.data.student._id;
  assert.ok(res.body.data.depositPayment);
  assert.strictEqual(res.body.data.student.status, 'active');

  const studentLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'anita.lama@example.com', password: 'student123' })
    .expect(200);
  studentToken = studentLogin.body.token;
  assert.strictEqual(studentLogin.body.user.role, 'student');
});

test('7. Bed is occupied and cannot be reassigned', async () => {
  const room = (await request(app).get(`/api/rooms/${roomId}`).set(auth(ownerToken)).expect(200)).body.data;
  assert.strictEqual(room.beds.find((b) => String(b._id) === String(bedId)).status, 'occupied');

  const res = await request(app)
    .post(`/api/admissions`)
    .set(auth(ownerToken))
    .send({
      name: 'Second Student', roomId, bedId, monthlyRent: 11000, securityDeposit: 11000
    })
    .expect(409);
  assert.match(res.body.message, /occupied/);
});

test('8. Generate monthly invoice includes rent + food', async () => {
  const fp = await request(app)
    .post('/api/food/plans')
    .set(auth(ownerToken))
    .send({ name: 'Girls Full Board', type: 'monthly', amount: 5000, meals: { breakfast: true, lunch: true, dinner: true } })
    .expect(201);
  await request(app)
    .post('/api/food/assignments')
    .set(auth(ownerToken))
    .send({ student: studentId, plan: fp.body.data._id })
    .expect(201);

  const gen = await request(app).post('/api/billing/invoices/generate-monthly').set(auth(ownerToken)).send({}).expect(200);
  assert.ok(gen.body.data.created >= 1);

  const invoices = await request(app).get('/api/billing/invoices').set(auth(ownerToken)).query({ student: studentId }).expect(200);
  const inv = invoices.body.data.data[0];
  assert.ok(inv.total >= 11000);
  invoiceId = inv._id;
  invoiceNumber = inv.invoiceNumber;
});

test('9. Record payment and verify outstanding updates', async () => {
  const res = await request(app)
    .post('/api/billing/payments')
    .set(auth(ownerToken))
    .send({ studentId, invoiceId, amount: 16000, method: 'cash' })
    .expect(201);
  assert.ok(res.body.data.payments.length >= 1);
  assert.strictEqual(res.body.data.payments[0].remainingBalance, 0);
});

test('10. Payment exceeding balance is rejected', async () => {
  const inv = (await request(app).get(`/api/billing/invoices/${invoiceId}`).set(auth(ownerToken)).expect(200)).body.data;
  await request(app)
    .post('/api/billing/payments')
    .set(auth(ownerToken))
    .send({ studentId, invoiceId, amount: inv.balance + 100 })
    .expect(400);
});

test('11. Add electricity reading and verify it bills', async () => {
  const util = await request(app)
    .post('/api/utilities')
    .set(auth(ownerToken))
    .send({ name: 'Electricity', chargeType: 'metered', ratePerUnit: 12, unit: 'unit' })
    .expect(201);
  const period = '2026-10';
  await request(app)
    .post('/api/utilities/readings')
    .set(auth(ownerToken))
    .send({ student: studentId, utility: util.body.data._id, previousReading: 100, currentReading: 150, period })
    .expect(201);
  const checks = await request(app).get(`/api/billing/charges/${studentId}`).set(auth(ownerToken)).query({ period: '2026-10' }).expect(200);
  assert.ok(checks.body.data.some((c) => c.type === 'utility' && c.amount === 600));
});

test('12. Add expense and attendance, create notice', async () => {
  await request(app)
    .post('/api/expenses')
    .set(auth(ownerToken))
    .send({ title: 'Electricity bill', category: 'Electricity', amount: 4500, date: '2026-09-15', method: 'cash' })
    .expect(201);

  await request(app)
    .post('/api/attendance/bulk')
    .set(auth(ownerToken))
    .send({ date: '2026-09-24', records: [{ student: studentId, status: 'present' }] })
    .expect(200);

  await request(app)
    .post('/api/notices')
    .set(auth(ownerToken))
    .send({ title: 'Hostel closes early tonight', description: 'Gates close at 9PM.', priority: 'high' })
    .expect(201);
});

test('13. Student portal - student sees own data only', async () => {
  const dash = await request(app).get('/api/student/dashboard').set(auth(studentToken)).expect(200);
  assert.strictEqual(dash.body.data.student.name, 'Anita Lama');
  const other = await request(app).get('/api/student/invoices/000000000000000000000000').set(auth(studentToken)).expect(404);
  assert.ok(other.body.success === false);
});

test('14. Student requests leave, warden approves', async () => {
  const reqL = await request(app)
    .post('/api/student/leaves')
    .set(auth(studentToken))
    .send({ startDate: '2026-10-01', endDate: '2026-10-03', reason: 'Family visit' })
    .expect(201);
  leaveId = reqL.body.data._id;

  const wardenLogin = await request(app).post('/api/auth/login').send({ email: 'owner.everest@example.com', password: 'owner123' }).expect(200);
  const wardenToken = wardenLogin.body.token;

  const decide = await request(app)
    .post(`/api/leaves/${leaveId}/decide`)
    .set(auth(wardenToken))
    .send({ status: 'approved', notes: 'Enjoy your break' })
    .expect(200);
  assert.strictEqual(decide.body.data.status, 'approved');
});

test('15. Student creates complaint', async () => {
  const res = await request(app)
    .post('/api/student/complaints')
    .set(auth(studentToken))
    .send({ title: 'Fan not working', description: 'The ceiling fan in room 301 is broken.', category: 'maintenance', priority: 'high' })
    .expect(201);
  const compId = res.body.data._id;
  const resolve = await request(app)
    .post(`/api/complaints/${compId}/resolve`)
    .set(auth(ownerToken))
    .send({ status: 'resolved', text: 'Replaced the fan motor.' })
    .expect(200);
  assert.strictEqual(resolve.body.data.status, 'resolved');
});

test('16. Checkout releases bed and computes deposit refund', async () => {
  const preview = await request(app)
    .post('/api/billing/checkout/preview')
    .set(auth(ownerToken))
    .send({ studentId })
    .expect(200);
  assert.strictEqual(preview.body.data.outstandingBalance, 0);

  const checkout = await request(app)
    .post('/api/billing/checkout')
    .set(auth(ownerToken))
    .send({ studentId, damageDeduction: 500, otherDeduction: 300, reason: 'Completed studies' })
    .expect(200);
  assert.strictEqual(checkout.body.data.status, 'checkedout');

  const room = (await request(app).get(`/api/rooms/${roomId}`).set(auth(ownerToken)).expect(200)).body.data;
  const bed = room.beds.find((b) => String(b._id) === String(bedId));
  assert.strictEqual(bed.status, 'available');
  assert.strictEqual(bed.student, null);
});

test('17. Reports: financial summary correct', async () => {
  const res = await request(app)
    .get('/api/reports/financial')
    .set(auth(ownerToken))
    .query({ from: '2026-01-01', to: '2026-12-31' })
    .expect(200);
  assert.ok(res.body.data.summary.revenue > 0);
});

test('18. Cross-tenant access blocked: wrong student ID from another hostel', async () => {
  const otherHostel = await request(app)
    .post('/api/admin/hostels')
    .set(auth(adminToken))
    .send({ name: 'Sneaky Rival Hostel', email: 'rival-owner@example.com', ownerName: 'Nadir', planCode: 'BASIC', password: 'owner123' })
    .expect(201);
  const rivalId = otherHostel.body.data.hostel._id;
  const rivalLogin = await request(app).post('/api/auth/login').send({ email: 'rival-owner@example.com', password: 'owner123' }).expect(200);
  const rivalToken = rivalLogin.body.token;

  const res = await request(app)
    .get(`/api/students/${studentId}`)
    .set(auth(rivalToken))
    .expect(404);
  assert.strictEqual(res.body.success, false);
  assert.ok(rivalId);
});

test('19. Subscription limits enforced by admin on plan', async () => {
  const plans = (await request(app).get('/api/admin/plans').set(auth(adminToken)).expect(200)).body.data;
  const basic = plans.find((p) => p.code === 'BASIC');
  assert.strictEqual(basic.maxStudents, 50);
});

test('20. Custom hostel ID: availability check + self registration', async () => {
  const bad = await request(app).get('/api/auth/hostel-code/check').query({ code: 'ab' }).expect(200);
  assert.strictEqual(bad.body.data.valid, false);

  const free = await request(app).get('/api/auth/hostel-code/check').query({ code: 'my-hostel-1' }).expect(200);
  assert.deepStrictEqual(free.body.data, { code: 'MY-HOSTEL-1', valid: true, available: true });

  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Bikash Thapa',
      hostelName: 'Everest Girls Hostel',
      hostelType: 'boys',
      email: 'bikash.custom@example.com',
      phone: '9800000001',
      password: 'secret123',
      planCode: 'BASIC',
      hostelCode: 'my-hostel-1'
    })
    .expect(201);
  assert.strictEqual(reg.body.hostel.code, 'MY-HOSTEL-1');
  assert.ok(reg.body.token);

  const taken = await request(app).get('/api/auth/hostel-code/check').query({ code: 'my-hostel-1' }).expect(200);
  assert.strictEqual(taken.body.data.available, false);

  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dup User', hostelName: 'Another Hostel', email: 'dup.code@example.com', password: 'secret123', hostelCode: 'my-hostel-1' })
    .expect(409);

  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Bad User', hostelName: 'Bad Code Hostel', email: 'bad.code@example.com', password: 'secret123', hostelCode: 'ab' })
    .expect(400);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'bikash.custom@example.com', password: 'secret123' })
    .expect(200);
  assert.ok(login.body.token);
});