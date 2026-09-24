const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { requireHostel } = require('../middleware/tenant');
const { permit } = require('../middleware/authorize');
const { MODULES } = require('../utils/roles');
const students = require('../controllers/studentController');
const { makeUploader } = require('../middleware/upload');

router.use(protect, requireHostel);

router.get('/', permit(MODULES.STUDENTS, 'read'), students.list);
router.post('/', permit(MODULES.STUDENTS, 'create'), students.create);
router.get('/:id', permit(MODULES.STUDENTS, 'read'), students.get);
router.put('/:id', permit(MODULES.STUDENTS, 'update'), students.update);
router.delete('/:id', permit(MODULES.STUDENTS, 'delete'), students.remove);
router.post('/:id/photo', permit(MODULES.STUDENTS, 'update'), makeUploader({ allow: 'image', fieldName: 'file', kind: 'photos' }), students.photo);

module.exports = router;