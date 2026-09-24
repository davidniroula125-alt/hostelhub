const router = require('express').Router();
const auth = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../utils/roles');
const { permit } = require('../middleware/authorize');

const loginSchema = {
  email: ['required', 'isEmail'],
  password: ['required', { validator: 'minLen', args: [6] }]
};

const registerSchema = {
  name: ['required'],
  hostelName: ['required'],
  email: ['required', 'isEmail'],
  password: ['required', { validator: 'minLen', args: [6] }],
  hostelCode: []
};

router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/logout', auth.logout);
router.post('/forgot-password', authLimiter, validate({ email: ['required', 'isEmail'] }), auth.forgotPassword);
router.post('/reset-password/:token', validate({ password: ['required', { validator: 'minLen', args: [6] }] }), auth.resetPassword);

router.use(protect);
router.get('/me', auth.me);
router.patch('/me', auth.updateProfile);
router.post('/change-password', validate({ currentPassword: ['required'], newPassword: ['required', { validator: 'minLen', args: [6] }] }), auth.changePassword);
router.post('/create-student-account', permit('students', 'create'), auth.createStudentAccount);

module.exports = router;