const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const rooms = require('../controllers/roomController');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.ROOMS, 'read'), rooms.list);
router.get('/summary', permit(MODULES.ROOMS, 'read'), rooms.summary);
router.get('/floors', permit(MODULES.ROOMS, 'read'), rooms.floors);
router.post('/', permit(MODULES.ROOMS, 'create'), rooms.create);
router.get('/:id', permit(MODULES.ROOMS, 'read'), rooms.get);
router.put('/:id', permit(MODULES.ROOMS, 'update'), rooms.update);
router.delete('/:id', permit(MODULES.ROOMS, 'delete'), rooms.remove);

router.post('/:id/beds', permit(MODULES.BEDS, 'create'), rooms.addBed);
router.delete('/:id/beds/:bedId', permit(MODULES.BEDS, 'delete'), rooms.removeBed);
router.patch('/:id/beds/:bedId/status', permit(MODULES.BEDS, 'update'), rooms.setBedStatus);
router.post('/:id/beds/:bedId/assign', permit(MODULES.BEDS, 'update'), rooms.assignBed);
router.post('/:id/beds/:bedId/unassign', permit(MODULES.BEDS, 'update'), rooms.unassignBed);

module.exports = router;