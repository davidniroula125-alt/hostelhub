const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { restrictTo } = require('../middleware/authorize');
const users = require('../controllers/userController');
const { ROLES } = require('../utils/roles');

router.use(protect, requireHostel, restrictTo(ROLES.OWNER, ROLES.MANAGER));

router.get('/', users.list);
router.get('/roles/list', users.roles);
router.post('/', users.create);
router.put('/:id', users.update);
router.delete('/:id', users.remove);

module.exports = router;