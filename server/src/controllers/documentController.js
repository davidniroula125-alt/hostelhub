const Document = require('../models/Document');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./crudFactory');
const { fileUrl } = require('../utils/helpers');
const { uploadRoot } = require('../middleware/upload');
const { logAudit } = require('../services/auditService');

factory.setModel(Document);

const CATEGORIES = ['citizenship', 'passport', 'student_id', 'college_id', 'photo', 'admission_form', 'agreement', 'receipt', 'other'];

const validateSubject = async (req, body) => {
  if (body.student) {
    const s = await Student.findOne({ _id: body.student, hostel: req.user.hostel });
    if (!s) throw new AppError('Student not found', 404);
  }
  if (body.staff) {
    const s = await Staff.findOne({ _id: body.staff, hostel: req.user.hostel });
    if (!s) throw new AppError('Staff not found', 404);
  }
  if (!body.student && !body.staff) throw new AppError('documents must belong to a student or staff member', 400);
};

module.exports = {
  list: catchAsync(async (req, res, next) => {
    const filter = { hostel: req.user.hostel };
    if (req.query.student) filter.student = req.query.student;
    if (req.query.staff) filter.staff = req.query.staff;
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    const docs = await Document.find(filter).sort('-createdAt');
    res.json({ success: true, data: docs });
  }),
  upload: catchAsync(async (req, res, next) => {
    const { category = 'other', title } = req.body;
    if (!CATEGORIES.includes(category)) return next(new AppError('Invalid document category', 400));
    await validateSubject(req, req.body);
    if (!req.file) return next(new AppError('No file uploaded', 400));
    const url = fileUrl(req.file, uploadRoot);
    const doc = await Document.create({
      hostel: req.user.hostel,
      student: req.body.student || undefined,
      staff: req.body.staff || undefined,
      category,
      title: title || req.file.originalname,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url,
      uploadedBy: req.user._id
    });
    await logAudit({ req, action: 'UPLOAD_DOCUMENT', module: 'documents', recordId: doc._id, description: `Uploaded ${title || req.file.originalname} (${category})` });
    res.status(201).json({ success: true, message: 'Document uploaded', data: doc });
  }),
  get: factory.getOne({ scope: (req) => ({ hostel: req.user.hostel }) }),
  download: catchAsync(async (req, res, next) => {
    const doc = await Document.findOne({ _id: req.params.id, hostel: req.user.hostel });
    if (!doc) return next(new AppError('Document not found', 404));
    res.json({ success: true, data: doc });
  }),
  remove: catchAsync(async (req, res, next) => {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, hostel: req.user.hostel });
    if (!doc) return next(new AppError('Document not found', 404));
    await logAudit({ req, action: 'DELETE_DOCUMENT', module: 'documents', recordId: doc._id, description: `Deleted document ${doc.title}` });
    res.json({ success: true, message: 'Document deleted' });
  })
};