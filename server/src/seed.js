require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Hostel = require('./models/Hostel');
const { SubscriptionPlan, Subscription } = require('./models/Subscription');
const { ROLES } = require('./utils/roles');
const config = require('./config');

const PLANS = [
  {
    name: 'Basic', code: 'BASIC', priceMonthly: 1000, priceYearly: 10000,
    maxStudents: 50, maxBranches: 1, trialDays: 14, sortOrder: 1,
    features: ['Rooms & beds', 'Student management', 'Payments', 'Invoices', 'Basic reports']
  },
  {
    name: 'Standard', code: 'STANDARD', priceMonthly: 2000, priceYearly: 20000,
    maxStudents: 150, maxBranches: 1, trialDays: 14, sortOrder: 2,
    features: ['Everything in Basic', 'Expenses', 'Food & mess', 'Attendance', 'Complaints', 'Visitors', 'Advanced reports']
  },
  {
    name: 'Premium', code: 'PREMIUM', priceMonthly: 4000, priceYearly: 40000,
    maxStudents: -1, maxBranches: 5, trialDays: 14, sortOrder: 3,
    features: ['Everything in Standard', 'Multiple branches', 'Payroll', 'Inventory', 'Advanced analytics', 'Priority support']
  }
];

async function seedPlans() {
  for (const p of PLANS) {
    await SubscriptionPlan.updateOne({ code: p.code }, { $set: p }, { upsert: true });
  }
  console.log('[seed] subscription plans ready');
}

async function seedSuperAdmin() {
  const email = 'admin@hostelhub.app';
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      name: 'HostelHub Super Admin',
      email,
      password: 'SuperAdmin@123',
      role: ROLES.SUPERADMIN,
      permissions: []
    });
    console.log('[seed] super admin created: admin@hostelhub.app / SuperAdmin@123');
  }
}

async function seedDemoHostel(force) {
  const existing = await Hostel.findOne({ slug: 'sunrise-boys-hostel' });
  if (existing && !force) {
    console.log('[seed] demo hostel already exists');
    return existing;
  }
  if (existing && force) {
    await mongoose.connection.dropCollection('students');
    await mongoose.connection.dropCollection('rooms');
    await mongoose.connection.dropCollection('invoices');
    await mongoose.connection.dropCollection('payments');
    await mongoose.connection.dropCollection('admissions');
    await mongoose.connection.dropCollection('foodplans');
    await mongoose.connection.dropCollection('foodassignments');
    await mongoose.connection.dropCollection('expenses');
    await mongoose.connection.dropCollection('notices');
  }

  const plan = await SubscriptionPlan.findOne({ code: 'STANDARD' });
  const hostel = existing || (await Hostel.create({
    name: 'Sunrise Boys Hostel',
    slug: 'sunrise-boys-hostel',
    code: 'SUNRISE-BH',
    type: 'boys',
    ownerName: 'Ram Prasad Shrestha',
    registrationNumber: 'NEP-H-2024-0112',
    address: { street: 'Gaushala-11', province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '11' },
    phone: '9841001122',
    altPhone: '01-4112233',
    email: 'sunrise@hostelhub.app',
    website: 'https://sunrisehostel.example.com',
    description: 'Affordable boys hostel near college campus.',
    emergencyContact: { name: 'Ram Prasad Shrestha', phone: '9841001122' },
    status: 'active',
    plan: plan._id,
    settings: {
      currency: 'NPR', invoicePrefix: 'SRN', receiptPrefix: 'SRR', dueDay: 5, lateFee: 50,
      invoiceFooter: 'Thank you! Late fee of Rs. 50 applies after the due date.',
      mealPrices: { breakfast: 50, lunch: 100, dinner: 100, snacks: 30 },
      roomTypes: ['Single', 'Double', 'Triple', 'Four-bed', 'Five-bed', 'Custom']
    },
    amenities: ['WiFi', 'Hot water', 'CCTV', 'Study room', 'Generator']
  }));

  const owner = await User.findOne({ email: 'owner@sunrise.example.com' });
  if (!owner) {
    await User.create({
      name: 'Ram Prasad Shrestha',
      email: 'owner@sunrise.example.com',
      phone: '9841001122',
      password: 'owner123',
      role: ROLES.OWNER,
      hostel: hostel._id
    });
    console.log('[seed] demo owner: owner@sunrise.example.com / owner123');
  }

  const sub = await Subscription.findOne({ hostel: hostel._id });
  if (!sub) {
    await Subscription.create({ hostel: hostel._id, plan: plan._id, status: 'active', startDate: new Date(), amount: plan.priceMonthly });
  }

  const Room = require('./models/Room');
  const Student = require('./models/Student');
  const { FoodPlan, FoodAssignment } = require('./models/FoodPlan');
  const Expense = require('./models/Expense');
  const Notice = require('./models/Notice');
  const { Utility } = require('./models/Utility');
  const { getCounter } = require('./services/numberService');

  const foodPlan = await FoodPlan.findOne({ hostel: hostel._id });
  if (!foodPlan) {
    await FoodPlan.create({
      hostel: hostel._id,
      name: 'Full Board Monthly',
      type: 'monthly',
      amount: 5500,
      meals: { breakfast: true, lunch: true, dinner: true, snacks: false },
      mealPrices: { breakfast: 50, lunch: 100, dinner: 100, snacks: 30 },
      description: 'Breakfast, lunch and dinner - full month'
    });
  }

  const existingUtils = await Utility.countDocuments({ hostel: hostel._id });
  if (!existingUtils) {
    await Utility.create([
      { hostel: hostel._id, name: 'Electricity', chargeType: 'metered', ratePerUnit: 12, unit: 'unit', billingEnabled: true },
      { hostel: hostel._id, name: 'Water', chargeType: 'fixed', amount: 300, billingEnabled: true },
      { hostel: hostel._id, name: 'Internet', chargeType: 'fixed', amount: 500, billingEnabled: true },
      { hostel: hostel._id, name: 'Room Cleaning', chargeType: 'fixed', amount: 200, billingEnabled: true }
    ]);
  }

  const existingExpenses = await Expense.countDocuments({ hostel: hostel._id });
  if (!existingExpenses) {
    const mk = (d, title, cat, amount) => ({ hostel: hostel._id, title, category: cat, amount, date: new Date(d), method: 'cash' });
    await Expense.insertMany([
      mk('2026-08-03', 'Monthly electricity bill', 'Electricity', 8200),
      mk('2026-08-05', 'Municipal water supply', 'Water', 2500),
      mk('2026-08-10', 'Internet fiber', 'Internet', 2100),
      mk('2026-08-15', 'Vegetables & groceries', 'Food', 18500),
      mk('2026-08-20', 'Cook salary', 'Staff salary', 15000),
      mk('2026-09-02', 'Repair broken fan Room 205', 'Repairs', 700),
      mk('2026-09-08', 'Cleaning supplies', 'Cleaning', 2400),
      mk('2026-09-14', 'Vegetables & groceries', 'Food', 16200)
    ]);
  }

  const existingNotices = await Notice.countDocuments({ hostel: hostel._id });
  if (!existingNotices) {
    await Notice.create([
      { hostel: hostel._id, title: 'Dashain holiday - hostel closed', description: 'Hostel will remain open but mess will be closed during Dashain. Please inform warden if staying.', priority: 'high', publishDate: new Date('2026-09-20'), visibleTo: 'all' },
      { hostel: hostel._id, title: 'Rent due date reminder', description: 'Rent for the month is due by the 5th. Late fee of Rs. 50 applies after.', priority: 'normal', publishDate: new Date('2026-08-28'), visibleTo: 'all' }
    ]);
  }

  const demoStudents = [
    { name: 'Ram Thapa', phone: '9842001001', college: 'Trinity International College', course: 'BSc CSIT', monthlyRent: 12000 },
    { name: 'Hari Sharma', phone: '9842001002', college: 'Prime College', course: 'BBA', monthlyRent: 12000 },
    { name: 'Sita Gurung', phone: '9842001003', college: 'NCCS', course: 'BSc CSIT', monthlyRent: 10500 },
    { name: 'Krishna Maharjan', phone: '9842001004', college: 'Islington College', course: 'BHM', monthlyRent: 10500 },
    { name: 'Bikash Tamang', phone: '9842001005', college: 'Kathmandu University', course: 'BE Civil', monthlyRent: 14500 },
    { name: 'Suman KC', phone: '9842001006', college: 'Patan College', course: 'BSW', monthlyRent: 9500 },
    { name: 'Dipesh Basnet', phone: '9842001007', college: 'Texas College', course: '+2 Science', monthlyRent: 9500 },
    { name: 'Nabin Adhikari', phone: '9842001008', college: 'Trinity International', course: 'BBS', monthlyRent: 12000 }
  ];

  const roomConfig = [
    { roomNumber: '101', floor: '1', beds: 4, rent: 9500 },
    { roomNumber: '102', floor: '1', beds: 4, rent: 9500 },
    { roomNumber: '103', floor: '1', beds: 4, rent: 10500 },
    { roomNumber: '201', floor: '2', beds: 4, rent: 12000 },
    { roomNumber: '202', floor: '2', beds: 4, rent: 14500 }
  ];

  const existingStudentCount = await Student.countDocuments({ hostel: hostel._id });
  const hostelsRoomCount = await Room.countDocuments({ hostel: hostel._id });
  if (!existingStudentCount || !hostelsRoomCount) {
    const rooms = [];
    for (const rc of roomConfig) {
      const beds = [];
      ['A', 'B', 'C', 'D'].slice(0, rc.beds).forEach((label) => beds.push({ label, status: 'available', history: [] }));
      const room = await Room.create({
        hostel: hostel._id,
        roomNumber: rc.roomNumber,
        floor: rc.floor,
        roomType: rc.beds === 4 ? 'Four-bed' : 'Double',
        monthlyRent: rc.rent,
        beds,
        facilities: ['WiFi']
      });
      rooms.push(room);
    }

    let bedCursor = 0;
    const beds = rooms.flatMap((r, ri) => r.beds.map((b) => ({ room: r, bed: b, idx: ri })));
    const createdUsers = [];
    for (let i = 0; i < demoStudents.length && i < 8; i++) {
      const s = demoStudents[i];
      const target = beds[i];
      const student = await Student.create({
        hostel: hostel._id,
        name: s.name,
        gender: 'male',
        nationality: 'Nepali',
        phone: s.phone,
        email: `${s.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com`,
        permanentAddress: 'Nepal',
        currentAddress: 'Kathmandu',
        college: s.college,
        course: s.course,
        level: 'Bachelor',
        studentId: `STU${1000 + i + 1}`,
        guardian: { name: `${s.name.split(' ')[0]} Prasad`, relationship: 'Father', phone: '9811000000' },
        emergency: { name: `${s.name} Family`, phone: '9811000001', relationship: 'Family' },
        admissionDate: new Date(2026, 5, 10 + i),
        monthlyRent: s.monthlyRent,
        securityDeposit: s.monthlyRent,
        status: 'active',
        deposit: { amount: s.monthlyRent, date: new Date(2026, 5, 10 + i), method: 'cash', refundStatus: 'none' }
      });

      const bed = target.bed;
      bed.status = 'occupied';
      bed.student = student._id;
      bed.studentName = student.name;
      bed.assignedAt = new Date();
      target.room.status = 'partial';
      target.room.markModified('beds');
      await target.room.save();
      student.room = target.room._id;
      student.bed = bed._id;
      student.bedLabel = bed.label;
      await student.save();

      const user = await User.create({
        name: student.name,
        email: student.email,
        phone: student.phone,
        password: 'student123',
        role: ROLES.STUDENT,
        hostel: hostel._id,
        student: student._id
      });
      createdUsers.push(user);

      const admissionNumber = await getCounter(hostel._id, 'admission');
      await require('./models/Admission').create({
        hostel: hostel._id,
        admissionNumber,
        student: student._id,
        room: target.room._id,
        bed: bed.label,
        monthlyRent: s.monthlyRent,
        securityDeposit: s.monthlyRent,
        depositMethod: 'cash',
        admissionDate: new Date(2026, 5, 10 + i)
      });
    }

    const fp = await FoodPlan.findOne({ hostel: hostel._id });
    for (const st of await Student.find({ hostel: hostel._id })) {
      await FoodAssignment.create({ hostel: hostel._id, student: st._id, plan: fp._id, amount: fp.amount, startDate: new Date(2026, 5, 1), status: 'active' });
    }

    const Invoice = require('./models/Invoice');
    const Payment = require('./models/Payment');
    for (const st of await Student.find({ hostel: hostel._id })) {
      const invoiceNum = await getCounter(hostel._id, 'invoice');
      const d = new Date(2026, 8, 1);
      const du = new Date(2026, 8, 5);
      const total = st.monthlyRent + fp.amount;
      const inv = await Invoice.create({
        hostel: hostel._id,
        invoiceNumber: invoiceNum,
        student: st._id,
        studentName: st.name,
        room: st.bedLabel !== null ? String(st.room || '') : '',
        invoiceDate: d,
        dueDate: du,
        period: 'Sep-2026',
        items: [
          { description: 'Room rent', type: 'rent', amount: st.monthlyRent },
          { description: `Mess: ${fp.name}`, type: 'food', amount: fp.amount }
        ],
        subtotal: total,
        discount: 0,
        total,
        paid: total,
        balance: 0,
        status: 'paid'
      });
      const rcpt = await getCounter(hostel._id, 'receipt');
      await Payment.create({
        hostel: hostel._id,
        receiptNumber: rcpt,
        student: st._id,
        studentName: st.name,
        invoice: inv._id,
        invoiceNumber: inv.invoiceNumber,
        amount: total,
        date: new Date(2026, 8, st._id.toString().length % 4 + 2),
        method: 'cash',
        receivedByName: 'Ram Prasad Shrestha',
        gateway: 'manual',
        previousBalance: total,
        remainingBalance: 0,
        status: 'completed'
      });
    }
  }

  return hostel;
}

async function ensureSeed(force = false) {
  await seedPlans();
  await seedSuperAdmin();
  if (config.demoSeed && !process.env.SKIP_DEMO) {
    await seedDemoHostel(force);
  }
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  const run = async () => {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 20000 });
    console.log('[seed] connected to MongoDB');
    await ensureSeed(force);
    console.log('[seed] done');
    process.exit(0);
  };
  run().catch((err) => {
    console.error('[seed] error:', err);
    process.exit(1);
  });
}

module.exports = { ensureSeed, seedPlans, seedSuperAdmin };