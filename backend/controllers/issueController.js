const IssueReport = require('../models/IssueReport');

// @desc    Submit a new issue or suggestion
// @route   POST /api/issues
// @access  Public
const createIssue = async (req, res) => {
  try {
    const { name, email, mobileNumber, type, description } = req.body;

    // Validate required fields
    if (!name || !email || !mobileNumber || !type || !description) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address format' });
    }

    // Validate Indian mobile number (10 digits starting with 6-9)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber.trim())) {
      return res.status(400).json({ message: 'Invalid 10-digit mobile number' });
    }

    // Validate type
    const normalizedType = type === 'Suggestion' ? 'Suggestion' : 'Issue';

    const issue = await IssueReport.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobileNumber: mobileNumber.trim(),
      type: normalizedType,
      description: description.trim(),
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: `${normalizedType} submitted successfully. Thank you for your feedback!`,
      issue,
    });
  } catch (error) {
    console.error('Error creating issue report:', error);
    res.status(500).json({ message: 'Server error while submitting report' });
  }
};

// @desc    Get all issues and suggestions (Super Admin only)
// @route   GET /api/issues
// @access  Private (Super Admin)
const getIssues = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};

    if (status && ['Pending', 'Resolved'].includes(status)) {
      filter.status = status;
    }

    if (type && ['Issue', 'Suggestion'].includes(type)) {
      filter.type = type;
    }

    const issues = await IssueReport.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ message: 'Server error while fetching reports' });
  }
};

// @desc    Update issue status (Pending / Resolved) (Super Admin only)
// @route   PATCH /api/issues/:id/status
// @access  Private (Super Admin)
const updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Pending', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either Pending or Resolved' });
    }

    const issue = await IssueReport.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: 'Report not found' });
    }

    issue.status = status;
    await issue.save();

    res.json({
      success: true,
      message: `Report status updated to ${status}`,
      issue,
    });
  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({ message: 'Server error while updating report status' });
  }
};

module.exports = {
  createIssue,
  getIssues,
  updateIssueStatus,
};
