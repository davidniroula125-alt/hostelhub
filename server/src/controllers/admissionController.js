const mongoose = require('mongoose');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Admission = require('../models/Admission');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { FoodPlan } = require('../models/FoodPlan');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { getCounter } = require('../services/numberService');
const { logAudit } = require('../services/auditService');
const { notify } = require('../services/notificationService');
const { sendMail } = require('../utils/email');
const { generateMonthlyInvoice, refreshStudentOutstanding } = require('../services/billingService');
const { ROLES } = require('../utils/roles');
const { buildPaginationResult } = require('../utils/helpers');

exports.list = catchAsync(async (req, res, next) => {
  const filter = { hostel: req.user.hostel };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const [total, data] = await Promise.all([
    Admission.countDocuments(filter),
    Admission.find(filter)
      .populate({ path: 'student', select: 'name phone room bedLabel admissionDate status' })
      .populate({ path: 'room', select: 'roomNumber' })
      .populate({ path: 'createdBy', select: 'name' })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.create = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const {
        name, gender, dob, nationality, citizenshipNumber, phone, email, permanentAddress, currentAddress,
        college, course, level, studentId,
        guardianName, guardianRelationship, guardianPhone, guardianEmail, guardianAddress,
        emergencyName, emergencyPhone, emergencyRelationship,
        roomId, bedId, monthlyRent, securityDeposit, depositMethod,
        foodPlan, foodAmount, admissionDate, notes, createAccount, portalOrganizer
      } = req.body;

      if (!name || !roomId || !bedId) {
        throw new AppError('Name, room and bed are required for admission', 400);
      }

      const room = await Room.findOne({ _id: roomId, hostel: req.user.hostel }).session(session);
      if (!room) throw new AppError('Room not found', 404);
      if (room.status === 'maintenance') throw new AppError('Room is under maintenance', 409);
      if (room.status === 'full') throw new AppError('Room is full', 409);

      const bedIndex = room.beds.findIndex((b) => String(b._id) === String(bedId));
      if (bedIndex === -1) throw new AppError('Bed not found', 404);
      const bed = room.beds[bedIndex];
      if (bed.status === 'occupied') throw new AppError('This bed is already occupied', 409);
      if (bed.status === 'maintenance') throw new AppError('This bed is under maintenance', 409);

      const duplicate = await Student.findOne({
        hostel: req.user.hostel,
        status: { $in: ['active', 'notice'] },
        $or: [{ name }, ...(phone ? [{ phone }] : []), ...(email ? [{ email }] : []), ...(studentId ? [{ studentId }] : [])]
      });
      if (duplicate) {
        throw new AppError('A student with the same name/phone/email/ID already exists', 409);
      }

      const rent = monthlyRent || room.monthlyRent || 0;
      const deposit = securityDeposit || room.securityDeposit || 0;

      let plan = null;
      if (foodPlan) {
        plan = await FoodPlan.findById(foodPlan);
        if (!plan) throw new AppError('Food plan not found', 404);
      }

      const student = await Student.create(
        [
          {
            hostel: req.user.hostel,
            branch: req.body.branch || req.user.branch,
            name, gender, dob, nationality, citizenshipNumber, phone, email,
            permanentAddress, currentAddress,
            college, course, level, studentId,
            guardian: { name: guardianName, relationship: guardianRelationship, phone: guardianPhone, email: guardianEmail, address: guardianAddress },
            emergency: { name: emergencyName, phone: emergencyPhone, relationship: emergencyRelationship },
            admissionDate: admissionDate || new Date(),
            monthlyRent: rent,
            securityDeposit: deposit,
            foodPlan: plan ? plan._id : undefined,
            foodAmount: foodAmount || (plan ? plan.amount : 0),
            status: 'active',
            deposit: deposit > 0 ? { amount: deposit, date: new Date(), method: depositMethod || 'cash', refundStatus: 'none' } : undefined,
            notes
          }
        ],
        { session }
      );
      const newStudent = student[0];

      bed.status = 'occupied';
      bed.student = newStudent._id;
      bed.studentName = newStudent.name;
      bed.assignedAt = new Date();
      room.status = Room.updateRoomStatus(room.beds);
      room.markModified('beds');
      await room.save({ session });

      newStudent.room = room._id;
      newStudent.bed = bed._id;
      newStudent.bedLabel = bed.label;
      await newStudent.save({ session });

      const admissionNumber = await getCounter(req.user.hostel, 'admission');
      const admission = await Admission.create(
        [
          {
            hostel: req.user.hostel,
            branch: newStudent.branch,
            admissionNumber,
            student: newStudent._id,
            room: room._id,
            bed: bed.label,
            monthlyRent: rent,
            securityDeposit: deposit,
            depositMethod: depositMethod || 'cash',
            foodPlan: plan ? plan.name : undefined,
            createdBy: req.user._id,
            admissionDate: admissionDate || new Date()
          }
        ],
        { session }
      );

      let depositPayment = null;
      if (deposit > 0) {
        const receiptNumber = await getCounter(req.user.hostel, 'receipt');
        depositPayment = await Payment.create(
          [
            {
              hostel: req.user.hostel,
              branch: newStudent.branch,
              receiptNumber,
              student: newStudent._id,
              studentName: newStudent.name,
              amount: deposit,
              method: depositMethod || 'cash',
              reference: 'Security deposit',
              notes: 'Security deposit collected at admission',
              receivedBy: req.user._id,
              receivedByName: req.user.name,
              gateway: 'manual',
              previousBalance: 0,
              remainingBalance: 0,
              status: 'completed'
            }
          ],
          { session }
        );
      }

      await logAudit({ req, action: 'ADMISSION', module: 'admissions', recordId: newStudent._id, description: `Admitted ${newStudent.name} to Room ${room.roomNumber} Bed ${bed.label}` });

      if (req.body.generateFirstInvoice) {
        await generateMonthlyInvoice({ studentId: newStudent._id, hostelId: req.user.hostel, asUserId: req.user._id, session });
        await refreshStudentOutstanding(newStudent._id, session);
      }

      if (createAccount) {
        const existing = await User.findOne({ student: newStudent._id });
        if (!existing) {
          let studentEmail = newStudent.email;
          if (!studentEmail) {
            const base = newStudent.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
            studentEmail = `${base}_${newStudent._id.toString().slice(-4)}@student.hostelhub.app`;
          }
          const password = req.body.portalPassword || 'student123';
          await User.create(
            [
              {
                name: newStudent.name,
                email: studentEmail,
                phone: newStudent.phone,
                password,
                role: ROLES.STUDENT,
                hostel: newStudent.hostel,
                branch: newStudent.branch,
                student: newStudent._id
              }
            ],
            { session }
          );
          await sendMail(studentEmail, 'admission', { name: newStudent.name, hostel: (await require('../models/Hostel').findById(req.user.hostel)).name, room: room.roomNumber, bed: bed.label, date: new Date().toLocaleDateString('en-CA') });
        }
      }

      await notify({ hostel: req.user.hostel, type: 'admission', title: 'New admission', message: `${newStudent.name} admitted to Room ${room.roomNumber} Bed ${bed.label}` });

      result = { student: newStudent, admission: admission[0], depositPayment: depositPayment ? depositPayment[0] : null };
    });
  } finally {
    await session.endSession();
  }
  res.status(201).json({ success: true, message: 'Student admitted successfully', data: result });
});

exports.availableBeds = catchAsync(async (req, res, next) => {
  const { roomId, studentId } = req.query;
  const filter = { hostel: req.user.hostel, status: { $in: ['available', 'partial'] } };
  if (roomId) filter._id = roomId;
  const rooms = await Room.find(filter).select('roomNumber floor roomType monthlyRent securityDeposit beds');
  const data = rooms.map((r) => ({
    id: r._id,
    roomNumber: r.roomNumber,
    floor: r.floor,
    roomType: r.roomType,
    monthlyRent: r.monthlyRent,
    securityDeposit: r.securityDeposit,
    beds: r.beds
      .filter((b) => b.status === 'available' || b.status === 'reserved')
      .map((b) => ({ id: b._id, label: b.label, status: b.status }))
  }));
  res.json({ success: true, data });
});