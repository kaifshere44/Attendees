const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  branch: {
    type: String,
    required: [true, 'Branch is required'],
    trim: true,
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true,
  },
  academicYear: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes for fast roll number lookup, birthdays, and admin filters
studentSchema.index({ dateOfBirth: 1 });
studentSchema.index({ createdAt: -1 });
studentSchema.index({ branch: 1, semester: 1 });
studentSchema.index({ name: 1, rollNumber: 1 });

module.exports = mongoose.model('Student', studentSchema);

