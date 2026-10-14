const mongoose = require('mongoose');

const issueReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['Issue', 'Suggestion'],
    required: [true, 'Report type is required'],
    default: 'Issue',
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Resolved'],
    default: 'Pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('IssueReport', issueReportSchema);
