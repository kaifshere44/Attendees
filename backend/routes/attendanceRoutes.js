const express = require('express');
const { verifyPin, markAttendance, getSessionAttendance, getAttendanceHistory } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { pinLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/verify-pin', pinLimiter, verifyPin);
router.post('/mark', markAttendance);
router.get('/session/:sessionId', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getSessionAttendance);
router.get('/history', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getAttendanceHistory);

module.exports = router;
