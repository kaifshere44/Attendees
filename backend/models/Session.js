const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
  },
  sessionDate: {
    type: Date,
    default: Date.now,
  },
  durationMinutes: {
    type: Number,
    default: 10,
    min: 1,
  },
  startTime: {
    type: String,
    required: false,
  },
  endTime: {
    type: String,
    required: false,
  },
  openedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  pinHash: {
    type: String,
    required: [true, 'PIN is required'],
  },
  pin: {
    type: String,
    required: false, // Only stored temporarily for display to admin
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Open', 'Closed'],
    default: 'Scheduled',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
}, {
  timestamps: true,
});

// Hash PIN before saving
sessionSchema.pre('save', async function() {
  if (!this.isModified('pinHash')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.pinHash = await bcrypt.hash(this.pinHash, salt);
});

// Method to compare PIN
sessionSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pinHash);
};

// Index for faster queries
sessionSchema.index({ sessionDate: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Session', sessionSchema);
