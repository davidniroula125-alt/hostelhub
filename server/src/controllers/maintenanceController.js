const Maintenance = require('../models/Maintenance');
const Room = require('../models/Room');
const Staff = require('../models/Staff');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { notify } = require('../services/notificationService');

factory.setModel(Maintenance);

module.exports = {
  list: factory.getAll({
    scope: (req) => ({ hostel: req.user.hostel }),
    searchFields: ['title', 'description', 'roomName'],
    sort: '-createdDate',
    listFilter: (req) => {
      const f = {};
      if (req.query.status && req.query.status !== 'all') f.status = req.query.status;
      if (req.query.priority && req.query.priority !== 'all') f.priority = req.query.priority;
      return f;
    }
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }), population: [{ path: 'room', select: 'roomNumber' }, { path: 'assignedTo', select: 'name position' }] }),
  create: factory.create({
    pre: async (body, req) => {
      let roomName = body.roomName;
      if (body.room) {
        const room = await Room.findOne({ _id: body.room, hostel: req.user.hostel });
        if (!room) throw new AppError('Room not found', 404);
        roomName = `Room ${room.roomNumber}`;
      }
      return { ...body, hostel: req.user.hostel, roomName, createdBy: req.user._id, createdDate: new Date() };
    },
    audit: { action: 'CREATE_MAINTENANCE', module: 'maintenance' }
  }),
  update: factory.update({ audit: { action: 'UPDATE_MAINTENANCE', module: 'maintenance' } }),
  assign: catchAsync(async (req, res, next) => {
    const { staffId } = req.body;
    const staffDoc = await Staff.findOne({ _id: staffId, hostel: req.user.hostel });
    if (!staffDoc) return next(new AppError('Staff not found', 404));
    const ticket = await Maintenance.findOneAndUpdate(
      { _id: req.params.id, hostel: req.user.hostel },
      { $set: { assignedTo: staffDoc._id, assignedToName: staffDoc.name, assignedDate: new Date(), status: 'assigned' } },
      { new: true }
    );
    if (!ticket) return next(new AppError('Maintenance ticket not found', 404));
    await notify({ hostel: req.user.hostel, type: 'maintenance', title: 'Maintenance assigned', message: `"${ticket.title}" assigned to ${staffDoc.name}` });
    res.json({ success: true, message: 'Ticket assigned', data: ticket });
  }),
  status: catchAsync(async (req, res, next) => {
    const { status, cost, notes, materials } = req.body;
    const allowed = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return next(new AppError('Invalid status', 400));
    const update = { status };
    if (cost !== undefined) update.cost = cost;
    if (notes !== undefined) update.notes = notes;
    if (materials !== undefined) update.materials = materials;
    if (status === 'completed') update.completedDate = new Date();
    const ticket = await Maintenance.findOneAndUpdate({ _id: req.params.id, hostel: req.user.hostel }, { $set: update }, { new: true });
    if (!ticket) return next(new AppError('Maintenance ticket not found', 404));
    await notify({ hostel: req.user.hostel, type: 'maintenance', title: 'Maintenance update', message: `"${ticket.title}" is now ${status}` });
    res.json({ success: true, message: 'Ticket updated', data: ticket });
  }),
  remove: factory.remove({ audit: { action: 'DELETE_MAINTENANCE', module: 'maintenance' } })
};