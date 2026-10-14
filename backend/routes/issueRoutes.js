const express = require('express');
const {
  createIssue,
  getIssues,
  updateIssueStatus,
} = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public: Submit report
router.post('/', createIssue);

// Protected: Super Admin only
router.get('/', protect, authorize('ADMIN_SUPER'), getIssues);
router.patch('/:id/status', protect, authorize('ADMIN_SUPER'), updateIssueStatus);

module.exports = router;
