const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const search = require('../controllers/searchController');

router.use(protect, requireHostel);

router.get('/', search.global);

module.exports = router;