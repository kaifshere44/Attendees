const express = require('express');
const {
  exportSessionExcel,
  exportSessionPdf,
  exportStudentsExcel,
  exportStudentsPdf,
  getHistory,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/session/:sessionId/excel', protect, authorize('ADMIN_SUPER'), exportSessionExcel);
router.get('/session/:sessionId/pdf', protect, authorize('ADMIN_SUPER'), exportSessionPdf);
router.get('/students/excel', protect, authorize('ADMIN_SUPER'), exportStudentsExcel);
router.get('/students/pdf', protect, authorize('ADMIN_SUPER'), exportStudentsPdf);
router.get('/history', protect, authorize('ADMIN_SUPER'), getHistory);

module.exports = router;
