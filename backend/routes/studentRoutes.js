const express = require('express');
const { registerStudent, checkRollNumber, getStudent, getAllStudents, getStudentBirthdays } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerStudent);
router.get('/check/:rollNumber', checkRollNumber);
router.get('/birthdays', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getStudentBirthdays);
router.get('/:id', getStudent);
router.get('/', protect, authorize('ADMIN_SUPER'), getAllStudents);

module.exports = router;
