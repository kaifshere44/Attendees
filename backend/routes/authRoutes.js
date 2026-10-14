const express = require('express');
const { loginAdmin, getMe, getStandardAdmin, updateStandardAdminCredentials } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login', loginLimiter, loginAdmin);
router.get('/me', protect, getMe);

// Super Admin management of Standard Admin credentials
router.get('/standard-admin', protect, authorize('ADMIN_SUPER'), getStandardAdmin);
router.put('/standard-admin/credentials', protect, authorize('ADMIN_SUPER'), updateStandardAdminCredentials);

module.exports = router;
