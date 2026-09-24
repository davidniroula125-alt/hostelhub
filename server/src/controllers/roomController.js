const Room = require('../models/Room');
const Student = require('../models/Student');
const Hostel = require('../models/Hostel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildPaginationResult } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');
const { notify } = require('../services/notificationService');
const { ROLES } = require('../utils/roles');

const DEFAULT_BED_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const isSuper = (req) => req.user?.role === ROLES.SUPERADMIN;

const roomFilter = (req) => {
  const filter = {};
  if (req.user?.hostel) filter.hostel = req.user.hostel;
  else if (isSuper(req)) {
    const hostelId = req.query.hostel || req.body?.hostel;
    if (hostelId) filter.hostel = hostelId;
  } else {
    filter.hostel = null;
  }
  if (req.query.branch) filter.branch = req.query.branch;
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.floor) filter.floor = req.query.floor;
  if (req.query.q) filter.roomNumber = { $regex: String(req.query.q), $options: 'i' };
  return filter;
};

const resolveCreateHostel = async (req) => {
  if (req.user?.hostel) return req.user.hostel;
  const hostelId = req.body?.hostel;
  if (!hostelId) throw new AppError('Select a hostel to add this room to', 400);
  const hostel = await Hostel.findById(hostelId).select('_id name');
  if (!hostel) throw new AppError('Hostel not found', 404);
  return hostel._id;
};

const buildBeds = (count, labels) => {
  const beds = [];
  const arr = labels && labels.length ? labels : DEFAULT_BED_LABELS.slice(0, count);
  arr.slice(0, count).forEach((label) => {
    beds.push({ label: String(label), status: 'available', history: [] });
  });
  return beds;
};

exports.list = catchAsync(async (req, res, next) => {
  const filter = roomFilter(req);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const [total, data] = await Promise.all([
    Room.countDocuments(filter),
    Room.find(filter)
      .populate({ path: 'beds.student', select: 'name photo' })
      .populate('hostel', 'name code')
      .sort({ floor: 1, roomNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
  ]);
  res.json({ success: true, data: buildPaginationResult(data, total, page, limit) });
});

exports.get = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (!isSuper(req)) filter.hostel = req.user.hostel;
  else if (req.user.hostel) filter.hostel = req.user.hostel;
  const room = await Room.findOne(filter).populate({ path: 'beds.student', select: 'name photo status' }).populate('hostel', 'name code');
  if (!room) return next(new AppError('Room not found', 404));
  res.json({ success: true, data: room });
});

exports.create = catchAsync(async (req, res, next) => {
  const { roomNumber, floor, roomType, bedsCount, monthlyRent, securityDeposit, facilities, bedLabels, status, notes } = req.body;
  if (!roomNumber || !String(roomNumber).trim()) return next(new AppError('Room number is required', 400));

  const hostelId = await resolveCreateHostel(req);
  const existing = await Room.findOne({ hostel: hostelId, roomNumber });
  if (existing) return next(new AppError('Room number already exists', 409));

  const count = Math.min(Math.max(parseInt(bedsCount || (bedLabels ? bedLabels.length : 0), 10) || 0, 0), 20);
  const room = await Room.create({
    hostel: hostelId,
    branch: req.body.branch || req.user.branch,
    roomNumber,
    floor,
    roomType: roomType || 'custom',
    monthlyRent: monthlyRent || 0,
    securityDeposit: securityDeposit || 0,
    facilities: facilities || [],
    status: status || 'available',
    beds: buildBeds(count, bedLabels),
    notes
  });
  await logAudit({ req, action: 'CREATE_ROOM', module: 'rooms', recordId: room._id, description: `Room ${roomNumber} created with ${count} beds` });
  res.status(201).json({ success: true, message: 'Room created', data: room });
});

exports.update = catchAsync(async (req, res, next) => {
  const allowed = ['roomNumber', 'floor', 'roomType', 'monthlyRent', 'securityDeposit', 'facilities', 'status', 'notes', 'branch'];
  const payload = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) payload[f] = req.body[f];
  });
  const filter = { _id: req.params.id };
  if (req.user.hostel) filter.hostel = req.user.hostel;
  const room = await Room.findOneAndUpdate(filter, { $set: payload }, { new: true, runValidators: true });
  if (!room) return next(new AppError('Room not found', 404));
  await logAudit({ req, action: 'UPDATE_ROOM', module: 'rooms', recordId: room._id, description: `Room ${room.roomNumber} updated` });
  res.json({ success: true, message: 'Room updated', data: room });
});

exports.remove = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.hostel) filter.hostel = req.user.hostel;
  const room = await Room.findOne(filter);
  if (!room) return next(new AppError('Room not found', 404));
  const occupied = (room.beds || []).some((b) => b.status === 'occupied');
  if (occupied) return next(new AppError('Cannot delete a room with occupied beds. Check out students first.', 409));
  await room.deleteOne();
  await logAudit({ req, action: 'DELETE_ROOM', module: 'rooms', recordId: room._id, description: `Room ${room.roomNumber} deleted` });
  res.json({ success: true, message: 'Room deleted' });
});

const tenantFilter = (req, id) => {
  const filter = { _id: id };
  if (req.user.hostel) filter.hostel = req.user.hostel;
  return filter;
};

exports.addBed = catchAsync(async (req, res, next) => {
  const room = await Room.findOne(tenantFilter(req, req.params.id));
  if (!room) return next(new AppError('Room not found', 404));
  const label = req.body.label || DEFAULT_BED_LABELS[room.beds.length] || `Bed ${room.beds.length + 1}`;
  const dup = room.beds.some((b) => String(b.label).toLowerCase() === String(label).toLowerCase());
  if (dup) return next(new AppError('Bed label already exists in this room', 409));
  room.beds.push({ label, status: 'available', history: [] });
  room.status = Room.updateRoomStatus(room.beds);
  await room.save();
  await logAudit({ req, action: 'ADD_BED', module: 'beds', recordId: room._id, description: `Bed ${label} added to room ${room.roomNumber}` });
  res.json({ success: true, message: 'Bed added', data: room });
});

exports.removeBed = catchAsync(async (req, res, next) => {
  const room = await Room.findOne(tenantFilter(req, req.params.id));
  if (!room) return next(new AppError('Room not found', 404));
  const idx = room.beds.findIndex((b) => String(b._id) === String(req.params.bedId));
  if (idx === -1) return next(new AppError('Bed not found', 404));
  if (room.beds[idx].status === 'occupied') return next(new AppError('Cannot remove an occupied bed. Unassign the student first.', 409));
  room.beds.splice(idx, 1);
  room.status = Room.updateRoomStatus(room.beds);
  await room.save();
  await logAudit({ req, action: 'REMOVE_BED', module: 'beds', recordId: room._id, description: `Bed removed from room ${room.roomNumber}` });
  res.json({ success: true, message: 'Bed removed', data: room });
});

exports.setBedStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  if (!['reserved', 'maintenance', 'available'].includes(status)) {
    return next(new AppError('Invalid bed status', 400));
  }
  const room = await Room.findOne(tenantFilter(req, req.params.id));
  if (!room) return next(new AppError('Room not found', 404));
  const idx = room.beds.findIndex((b) => String(b._id) === String(req.params.bedId));
  if (idx === -1) return next(new AppError('Bed not found', 404));
  if (room.beds[idx].status === 'occupied' && status !== 'available') {
    return next(new AppError('Cannot set status on an occupied bed', 409));
  }
  room.beds[idx].status = status;
  room.status = Room.updateRoomStatus(room.beds);
  room.markModified('beds');
  await room.save();
  await logAudit({ req, action: 'BED_STATUS', module: 'beds', recordId: room._id, description: `Bed ${room.beds[idx].label} set to ${status}` });
  res.json({ success: true, message: `Bed set to ${status}`, data: room });
});

exports.assignBed = catchAsync(async (req, res, next) => {
  const { studentId } = req.body;
  if (!studentId) return next(new AppError('studentId is required', 400));

  const studentFilter = { _id: studentId };
  if (req.user.hostel) studentFilter.hostel = req.user.hostel;
  const student = await Student.findOne(studentFilter);
  if (!student) return next(new AppError('Student not found', 404));
  if (student.status !== 'active' && student.status !== 'notice') {
    return next(new AppError(`Cannot assign bed to a student with status "${student.status}"`, 409));
  }

  const existingBed = await Student.findOne({ _id: studentId, bed: { $ne: null } });
  if (existingBed && existingBed.bed) {
    return next(new AppError('Student already has a bed assigned. Check them out first or unassign.', 409));
  }

  const room = await Room.findOne(tenantFilter(req, req.params.id));
  if (!room) return next(new AppError('Room not found', 404));
  if (room.status === 'maintenance') return next(new AppError('Room is under maintenance', 409));
  if (room.status === 'full') return next(new AppError('Room is full', 409));

  const bedIdx = room.beds.findIndex((b) => String(b._id) === String(req.params.bedId));
  if (bedIdx === -1) return next(new AppError('Bed not found', 404));
  const bed = room.beds[bedIdx];
  if (bed.status === 'occupied') return next(new AppError('This bed is already occupied', 409));
  if (bed.status === 'maintenance') return next(new AppError('This bed is under maintenance', 409));

  bed.status = 'occupied';
  bed.student = studentId;
  bed.studentName = student.name;
  bed.assignedAt = new Date();
  room.status = Room.updateRoomStatus(room.beds);
  room.markModified('beds');
  await room.save();

  student.room = room._id;
  student.bed = bed._id;
  student.bedLabel = bed.label;
  if (!student.monthlyRent) student.monthlyRent = room.monthlyRent || 0;
  if (!student.securityDeposit) student.securityDeposit = room.securityDeposit || 0;
  await student.save();

  await logAudit({ req, action: 'ASSIGN_BED', module: 'beds', recordId: room._id, description: `Assigned ${student.name} to bed ${bed.label} in room ${room.roomNumber}` });
  await notify({ hostel: req.user.hostel, type: 'allocation', title: 'Room allocated', message: `${student.name} allocated to Room ${room.roomNumber} Bed ${bed.label}` });

  res.json({ success: true, message: `Bed ${bed.label} assigned to ${student.name}`, data: { room, student } });
});

exports.unassignBed = catchAsync(async (req, res, next) => {
  const room = await Room.findOne(tenantFilter(req, req.params.id));
  if (!room) return next(new AppError('Room not found', 404));
  const bedIdx = room.beds.findIndex((b) => String(b._id) === String(req.params.bedId));
  if (bedIdx === -1) return next(new AppError('Bed not found', 404));
  const bed = room.beds[bedIdx];
  if (bed.status !== 'occupied') return next(new AppError('This bed is not occupied', 400));

  if (bed.student) {
    const student = await Student.findById(bed.student);
    if (student) {
      student.room = null;
      student.bed = null;
      student.bedLabel = null;
      await student.save();
    }
  }
  if (bed.history) {
    bed.history.push({ student: bed.student, studentName: bed.studentName, status: 'occupied', from: bed.assignedAt, to: new Date() });
  }
  bed.status = 'available';
  bed.student = null;
  bed.studentName = null;
  bed.assignedAt = null;
  room.status = Room.updateRoomStatus(room.beds);
  room.markModified('beds');
  await room.save();

  await logAudit({ req, action: 'UNASSIGN_BED', module: 'beds', recordId: room._id, description: `Released bed ${bed.label} in room ${room.roomNumber}` });
  res.json({ success: true, message: 'Bed released', data: room });
});

exports.summary = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.user.hostel) filter.hostel = req.user.hostel;
  else if (isSuper(req) && req.query.hostel) filter.hostel = req.query.hostel;
  else if (!isSuper(req)) filter.hostel = null;
  const rooms = await Room.find(filter);
  let totalBeds = 0;
  let occupied = 0;
  let available = 0;
  let reserved = 0;
  let maintenance = 0;
  rooms.forEach((r) => {
    (r.beds || []).forEach((b) => {
      totalBeds += 1;
      if (b.status === 'occupied') occupied += 1;
      else if (b.status === 'reserved') reserved += 1;
      else if (b.status === 'maintenance') maintenance += 1;
      else available += 1;
    });
  });
  res.json({
    success: true,
    data: {
      totalRooms: rooms.length,
      totalBeds,
      occupied,
      available,
      reserved,
      maintenance,
      occupiedPercent: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0
    }
  });
});

exports.floors = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.user.hostel) filter.hostel = req.user.hostel;
  else if (isSuper(req) && req.query.hostel) filter.hostel = req.query.hostel;
  else if (!isSuper(req)) filter.hostel = null;
  const floors = await Room.distinct('floor', filter);
  const types = await Room.distinct('roomType', filter);
  res.json({ success: true, data: { floors: floors.filter(Boolean), types: types.filter(Boolean) } });
});