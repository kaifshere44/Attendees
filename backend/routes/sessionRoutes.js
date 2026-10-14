const express = require('express');
const {
  createSession,
  getSessions,
  getActiveSession,
  getSession,
  openSession,
  closeSession,
  regeneratePin,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), createSession);
router.get('/', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getSessions);
router.get('/active', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getActiveSession);
router.get('/:id', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), getSession);
router.patch('/:id/open', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), openSession);
router.patch('/:id/close', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), closeSession);
router.patch('/:id/pin', protect, authorize('ADMIN_STANDARD', 'ADMIN_SUPER'), regeneratePin);

module.exports = router;
