const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Session = require('../models/Session');

// @desc    Verify PIN
// @route   POST /api/attendance/verify-pin
// @access  Public
const verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: 'PIN is required' });
    }

    // Find open sessions
    const openSessions = await Session.find({ status: 'Open' }).sort({ createdAt: -1 });

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

// @desc    Mark attendance
// @route   POST /api/attendance/mark
// @access  Public
const markAttendance = async (req, res) => {
  try {
    const { sessionId, rollNumber } = req.body;

    if (!sessionId || !rollNumber) {
      return res.status(400).json({ message: 'Session ID and roll number are required' });
    }

    // Find student
    const student = await Student.findOne({ rollNumber: rollNumber.trim().toUpperCase() });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'Open') {
      return res.status(400).json({ message: 'Session is not open for attendance' });
    }

    // Check if session timer has expired
    const now = new Date();
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

    // Check if attendance already marked
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      sessionId: session._id,
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    // Mark attendance
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
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance for a session
// @route   GET /api/attendance/session/:sessionId
// @access  Private (Admin)
const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const attendance = await Attendance.find({ sessionId })
      .populate('studentId', 'name rollNumber mobileNumber email branch semester')
      .sort({ attendanceTimestamp: 1 });

    res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
// @access  Private (Admin)
const getAttendanceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const attendance = await Attendance.find()
      .populate('studentId', 'name rollNumber branch semester')
      .populate('sessionId', 'sessionName sessionDate')
      .sort({ attendanceTimestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendance.countDocuments();

    res.json({
      success: true,
      attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
};
