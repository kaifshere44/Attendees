const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

// Method to compare PIN with high-speed timing-safe check and bcrypt fallback
sessionSchema.methods.comparePin = async function(candidatePin) {
  if (!candidatePin) return false;
  const candStr = String(candidatePin).trim();

  // 1. Fast constant-time check if plain PIN is present in session
  if (this.pin && typeof this.pin === 'string') {
    const pinStr = String(this.pin).trim();
    if (candStr.length === pinStr.length) {
      try {
        const isMatch = crypto.timingSafeEqual(Buffer.from(candStr), Buffer.from(pinStr));
        if (isMatch) return true;
      } catch {}
    }
  }

  // 2. Cryptographic bcrypt comparison against pinHash
  if (this.pinHash) {
    return await bcrypt.compare(candStr, this.pinHash);
  }

  return false;
};

// Index for faster queries
sessionSchema.index({ sessionDate: -1 });
sessionSchema.index({ status: 1, createdAt: -1 });
sessionSchema.index({ status: 1, expiresAt: 1 });
sessionSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Session', sessionSchema);
