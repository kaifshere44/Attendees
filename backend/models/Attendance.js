const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required'],
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session ID is required'],
  },
  attendanceTimestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Unique compound index to prevent duplicate attendance
attendanceSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

// Index for faster queries
attendanceSchema.index({ sessionId: 1 });
attendanceSchema.index({ studentId: 1 });
attendanceSchema.index({ attendanceTimestamp: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
