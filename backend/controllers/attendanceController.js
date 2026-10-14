const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Session = require('../models/Session');

// In-memory cache for currently active open session (TTL 4s)
let cachedActiveSession = null;
let cachedActiveSessionExpiry = 0;

const invalidateActiveSessionCache = () => {
  cachedActiveSession = null;
  cachedActiveSessionExpiry = 0;
};

const getActiveOpenSessions = async () => {
  const now = Date.now();
  if (cachedActiveSession && now < cachedActiveSessionExpiry) {
    if (!cachedActiveSession.expiresAt || new Date(cachedActiveSession.expiresAt).getTime() > now) {
      return [cachedActiveSession];
    }
    invalidateActiveSessionCache();
  }

  const openSessions = await Session.find({ status: 'Open' }).limit(3).sort({ createdAt: -1 });
  if (openSessions && openSessions.length > 0) {
    cachedActiveSession = openSessions[0];
    cachedActiveSessionExpiry = now + 4000;
  }
  return openSessions;
};

// @desc    Verify PIN
// @route   POST /api/attendance/verify-pin
// @access  Public
const verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: 'PIN is required' });
    }

    // Find open sessions (cached for 4s to handle concurrent requests)
    const openSessions = await getActiveOpenSessions();

    if (!openSessions || openSessions.length === 0) {
      return res.status(400).json({ message: 'No active session found' });
    }

    const now = new Date();
    let matchingSession = null;

    for (const s of openSessions) {
      // Check timer expiration
      if (s.expiresAt && now > new Date(s.expiresAt)) {
        s.status = 'Closed';
        await s.save();
        invalidateActiveSessionCache();
        continue;
      }
      const isPinValid = await s.comparePin(pin);
      if (isPinValid) {
        matchingSession = s;
        break;
      }
    }

    if (!matchingSession) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    const session = matchingSession;

    if (session.startTime && session.endTime && session.startTime.includes(':') && session.endTime.includes(':')) {
      const sessionDate = new Date(session.sessionDate || Date.now());
      const [startHours, startMinutes] = session.startTime.split(':').map(Number);
      const [endHours, endMinutes] = session.endTime.split(':').map(Number);

      const startTime = new Date(sessionDate);
      startTime.setHours(startHours, startMinutes, 0, 0);

      const endTime = new Date(sessionDate);
      endTime.setHours(endHours, endMinutes, 0, 0);

      if (now < startTime) {
        return res.status(400).json({ message: 'Session has not started yet' });
      }

      if (now > endTime) {
        session.status = 'Closed';
        await session.save();
        return res.status(400).json({ message: 'Session has ended' });
      }
    }

    res.json({
      success: true,
      message: 'PIN verified successfully',
      session: {
        id: session._id,
        sessionName: session.sessionName,
        sessionDate: session.sessionDate,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark attendance (supports direct PIN submission or sessionId)
// @route   POST /api/attendance/mark
// @access  Public
const markAttendance = async (req, res) => {
  try {
    const { sessionId, rollNumber, pin } = req.body;

    if (!rollNumber || (!sessionId && !pin)) {
      return res.status(400).json({ message: 'Roll number and either Session ID or PIN are required' });
    }

    const normalizedRollNumber = rollNumber.trim().toUpperCase();

    // 1. Fetch student with projection
    const student = await Student.findOne({ rollNumber: normalizedRollNumber })
      .select('_id name rollNumber')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found. Please register first.' });
    }

    const now = new Date();
    let session = null;

    // 2. Identify session
    if (sessionId) {
      session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
    } else if (pin) {
      // Direct PIN attendance flow: find matching active open session in 1 step!
      const openSessions = await getActiveOpenSessions();
      if (!openSessions || openSessions.length === 0) {
        return res.status(400).json({ message: 'No active session found' });
      }

      for (const s of openSessions) {
        if (s.expiresAt && now > new Date(s.expiresAt)) {
          s.status = 'Closed';
          await s.save();
          invalidateActiveSessionCache();
          continue;
        }
        const isPinValid = await s.comparePin(pin);
        if (isPinValid) {
          session = s;
          break;
        }
      }

      if (!session) {
        return res.status(400).json({ message: 'Invalid PIN or session expired' });
      }
    }

    if (session.status !== 'Open') {
      return res.status(400).json({ message: 'Session is not open for attendance' });
    }

    // 3. Check expiration
    if (session.expiresAt) {
      if (now > new Date(session.expiresAt)) {
        session.status = 'Closed';
        await session.save();
        return res.status(400).json({ message: 'Session timer has expired. Attendance closed.' });
      }
    } else if (session.startTime && session.endTime && session.startTime.includes(':') && session.endTime.includes(':')) {
      const sessionDate = new Date(session.sessionDate || Date.now());
      const [startHours, startMinutes] = session.startTime.split(':').map(Number);
      const [endHours, endMinutes] = session.endTime.split(':').map(Number);

      const startTime = new Date(sessionDate);
      startTime.setHours(startHours, startMinutes, 0, 0);

      const endTime = new Date(sessionDate);
      endTime.setHours(endHours, endMinutes, 0, 0);

      if (now < startTime) {
        return res.status(400).json({ message: 'Session has not started yet' });
      }

      if (now > endTime) {
        session.status = 'Closed';
        await session.save();
        return res.status(400).json({ message: 'Session has ended' });
      }
    }

    // 4. Check if attendance already marked (lean index lookup)
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      sessionId: session._id,
    }).select('_id').lean();

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    // 5. Mark attendance
    const attendance = await Attendance.create({
      studentId: student._id,
      sessionId: session._id,
      attendanceTimestamp: now,
    });

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        id: attendance._id,
        sessionName: session.sessionName,
        timestamp: attendance.attendanceTimestamp,
      },
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance for a session (optimized with lean)
// @route   GET /api/attendance/session/:sessionId
// @access  Private (Admin)
const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const attendance = await Attendance.find({ sessionId })
      .populate('studentId', 'name rollNumber mobileNumber email branch semester')
      .sort({ attendanceTimestamp: 1 })
      .lean();

    res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance history (optimized with parallel execution & lean)
// @route   GET /api/attendance/history
// @access  Private (Admin)
const getAttendanceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const [attendance, total] = await Promise.all([
      Attendance.find()
        .populate('studentId', 'name rollNumber branch semester')
        .populate('sessionId', 'sessionName sessionDate')
        .sort({ attendanceTimestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(),
    ]);

    res.json({
      success: true,
      attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  verifyPin,
  markAttendance,
  getSessionAttendance,
  getAttendanceHistory,
  invalidateActiveSessionCache,
};
