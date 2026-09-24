const router = require('express').Router();
const { protect } = require('../middleware/auth');
const notifications = require('../controllers/notificationController');

router.use(protect);

router.get('/', notifications.list);
router.get('/unread-count', notifications.unreadCount);
router.post('/read/:id?', notifications.markRead);
router.delete('/clear', notifications.clear);

module.exports = router;