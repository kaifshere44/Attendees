const Session = require('../models/Session');
const crypto = require('crypto');
const { invalidateActiveSessionCache } = require('./attendanceController');

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (Admin)
const createSession = async (req, res) => {
  try {
    const { sessionName, sessionDate, durationMinutes, startTime, endTime } = req.body;

    if (!sessionName || !sessionName.trim()) {
      return res.status(400).json({ message: 'Session name is required' });
    }

    const duration = parseInt(durationMinutes, 10) || 10;
    const date = sessionDate ? new Date(sessionDate) : new Date();

    // Generate a random 6-digit PIN
    const pin = crypto.randomInt(100000, 999999).toString();

    const session = await Session.create({
      sessionName: sessionName.trim(),
      sessionDate: date,
      durationMinutes: duration,
      startTime: startTime || '',
      endTime: endTime || '',
      pinHash: pin, // Will be hashed by pre-save hook
      pin, // Store temporarily for admin to see
      createdBy: req.admin._id,
      status: 'Scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      session: {
        id: session._id,
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        durationMinutes: session.durationMinutes,
        startTime: session.startTime,
        endTime: session.endTime,
        pin: session.pin,
        status: session.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all sessions
// @route   GET /api/sessions
// @access  Private (Admin)
const getSessions = async (req, res) => {
  try {
    const now = new Date();
    // Auto-close any open sessions whose timer has expired
    await Session.updateMany(
      { status: 'Open', expiresAt: { $lt: now } },
      { $set: { status: 'Closed' } }
    );

    const sessions = await Session.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get active session
// @route   GET /api/sessions/active
// @access  Private (Admin)
const getActiveSession = async (req, res) => {
  try {
    const session = await Session.findOne({ status: 'Open' })
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    if (!session) {
      return res.json({
        success: true,
        session: null,
      });
    }

    // Auto-close if timer expired
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      session.status = 'Closed';
      await session.save();
      return res.json({
        success: true,
        session: null,
      });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        durationMinutes: session.durationMinutes || 10,
        openedAt: session.openedAt,
        expiresAt: session.expiresAt,
        startTime: session.startTime,
        endTime: session.endTime,
        pin: session.pin,
        status: session.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Private (Admin)
const getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({
      success: true,
      session: {
        id: session._id,
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
        durationMinutes: session.durationMinutes || 10,
        openedAt: session.openedAt,
        expiresAt: session.expiresAt,
        startTime: session.startTime,
        endTime: session.endTime,
        pin: session.pin,
        status: session.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Open session
// @route   PATCH /api/sessions/:id/open
// @access  Private (Admin)
const openSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'Open') {
      return res.status(400).json({ message: 'Session is already open' });
    }

    if (session.status === 'Closed') {
      return res.status(400).json({ message: 'Cannot reopen a closed session' });
    }

    const duration = session.durationMinutes || 10;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    // Auto-close any other currently open sessions
    await Session.updateMany(
      { _id: { $ne: session._id }, status: 'Open' },
      { $set: { status: 'Closed' } }
    );

    session.status = 'Open';
    session.openedAt = now;
    session.expiresAt = expiresAt;
    session.startTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    session.endTime = expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    await session.save();
    invalidateActiveSessionCache();

    res.json({
      success: true,
      message: 'Session opened successfully',
      session: {
        id: session._id,
        status: session.status,
        durationMinutes: session.durationMinutes,
        openedAt: session.openedAt,
        expiresAt: session.expiresAt,
        startTime: session.startTime,
        endTime: session.endTime,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Close session
// @route   PATCH /api/sessions/:id/close
// @access  Private (Admin)
const closeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'Closed') {
      return res.status(400).json({ message: 'Session is already closed' });
    }

    session.status = 'Closed';
    await session.save();
    invalidateActiveSessionCache();

    res.json({
      success: true,
      message: 'Session closed successfully',
      session: {
        id: session._id,
        status: session.status,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Regenerate PIN
// @route   PATCH /api/sessions/:id/pin
// @access  Private (Admin)
const regeneratePin = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'Closed') {
      return res.status(400).json({ message: 'Cannot regenerate PIN for a closed session' });
    }

    // Generate new PIN
    const newPin = crypto.randomInt(100000, 999999).toString();
    session.pinHash = newPin;
    session.pin = newPin;
    await session.save();
    invalidateActiveSessionCache();

    res.json({
      success: true,
      message: 'PIN regenerated successfully',
      session: {
        id: session._id,
        pin: session.pin,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSession,
  getSessions,
  getActiveSession,
  getSession,
  openSession,
  closeSession,
  regeneratePin,
};
