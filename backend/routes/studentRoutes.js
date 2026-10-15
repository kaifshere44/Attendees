const express = require('express');
const {
  registerStudent,
  checkRollNumber,
  getStudent,
  getAllStudents,
  getStudentBirthdays,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerStudent);
router.get('/check/:rollNumber', checkRollNumber);
router.get('/birthdays', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getStudentBirthdays);
router.get('/', protect, authorize('ADMIN_SUPER'), getAllStudents);
router.get('/:id', getStudent);
router.put('/:id', protect, authorize('ADMIN_SUPER'), updateStudent);
router.delete('/:id', protect, authorize('ADMIN_SUPER'), deleteStudent);

module.exports = router;
