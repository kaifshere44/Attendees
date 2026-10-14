const Student = require('../models/Student');

// High-speed in-memory caches for frequent reads
const ROLL_CACHE_TTL = 60 * 1000; // 60 seconds
const rollCheckCache = new Map();

let birthdayCache = {
  data: null,
  expiresAt: 0,
};

const getFromRollCache = (roll) => {
  const item = rollCheckCache.get(roll);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    rollCheckCache.delete(roll);
    return null;
  }
  return item.data;
};

const setInRollCache = (roll, data, ttl = ROLL_CACHE_TTL) => {
  if (rollCheckCache.size > 2000) {
    const keys = rollCheckCache.keys();
    for (let i = 0; i < 500; i++) {
      const k = keys.next().value;
      if (k) rollCheckCache.delete(k);
    }
  }
  rollCheckCache.set(roll, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

const invalidateRollCache = (roll) => {
  if (roll) {
    rollCheckCache.delete(roll);
  } else {
    rollCheckCache.clear();
  }
  // Invalidate birthdays cache on student registration/update
  birthdayCache.data = null;
  birthdayCache.expiresAt = 0;
};

// @desc    Register a new student
// @route   POST /api/students/register
// @access  Public
const registerStudent = async (req, res) => {
  try {
    const { name, rollNumber, mobileNumber, email, branch, semester, academicYear, dateOfBirth, dob } = req.body;

    // Resolve semester (defaults to 'N/A' for Ph.D if omitted)
    const resolvedSemester = semester && semester.trim() ? semester.trim() : (branch && branch.toLowerCase().includes('ph.d') ? 'N/A' : '');

    // Validate required fields
    if (!name || !rollNumber || !mobileNumber || !email || !branch || !resolvedSemester) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate Indian mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    // Normalize roll number and email
    const normalizedRollNumber = rollNumber.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if student already exists - lean projection
    const existingStudent = await Student.findOne({
      $or: [
        { rollNumber: normalizedRollNumber },
        { email: normalizedEmail }
      ]
    }).select('rollNumber email').lean();

    if (existingStudent) {
      if (existingStudent.rollNumber === normalizedRollNumber) {
        return res.status(400).json({ message: 'Student with this roll number already exists' });
      }
      if (existingStudent.email === normalizedEmail) {
        return res.status(400).json({ message: 'Student with this email already exists' });
      }
    }

    // Create student
    const student = await Student.create({
      name: name.trim(),
      rollNumber: normalizedRollNumber,
      mobileNumber: mobileNumber.trim(),
      email: normalizedEmail,
      branch: branch.trim(),
      semester: resolvedSemester,
      academicYear: academicYear ? academicYear.trim() : undefined,
      dateOfBirth: (dateOfBirth || dob) ? (dateOfBirth || dob).trim() : undefined,
    });

    const studentResult = {
      id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
    };

    // Update in-memory lookup cache instantly so subsequent checks take <1ms
    invalidateRollCache(normalizedRollNumber);
    setInRollCache(normalizedRollNumber, {
      success: true,
      exists: true,
      student: studentResult,
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: studentResult,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Student with this roll number or email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if roll number exists (sub-millisecond cache + indexed projection)
// @route   GET /api/students/check/:rollNumber
// @access  Public
const checkRollNumber = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Roll number is required' });
    }

    const normalizedRollNumber = rollNumber.trim().toUpperCase();

    // 1. Check in-memory fast cache (returns in <1ms)
    const cached = getFromRollCache(normalizedRollNumber);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // 2. Query MongoDB with lean projection on indexed field
    const student = await Student.findOne({ rollNumber: normalizedRollNumber })
      .select('_id name rollNumber')
      .lean();

    if (student) {
      const responseData = {
        success: true,
        exists: true,
        student: {
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
        },
      };
      setInRollCache(normalizedRollNumber, responseData, ROLL_CACHE_TTL);
      res.setHeader('X-Cache', 'MISS');
      return res.json(responseData);
    }

    // 3. Cache negative lookup for 30s to make retry/back navigation instantaneous
    const notFoundData = {
      success: true,
      exists: false,
    };
    setInRollCache(normalizedRollNumber, notFoundData, 30 * 1000);
    res.setHeader('X-Cache', 'MISS');
    return res.json(notFoundData);
  } catch (error) {
    console.error('Error checking roll number:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/me
// @access  Private (for student)
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select('name rollNumber branch semester')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      success: true,
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        branch: student.branch,
        semester: student.semester,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all students (Super Admin only - optimized with parallel count & lean)
// @route   GET /api/students
// @access  Private (Super Admin)
const getAllStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { rollNumber: searchRegex }, { branch: searchRegex }];
    }

    // Execute query and total count concurrently
    const [students, total] = await Promise.all([
      Student.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query),
    ]);

    res.json({
      success: true,
      students,
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

// @desc    Get students with birthdays (Standard Admin & Super Admin)
// @route   GET /api/students/birthdays
// @access  Private (ADMIN_STANDARD, ADMIN_SUPER)
const getStudentBirthdays = async (req, res) => {
  try {
    if (birthdayCache.data && Date.now() < birthdayCache.expiresAt) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(birthdayCache.data);
    }

    // Only select students who have a valid dateOfBirth
    const students = await Student.find(
      {
        dateOfBirth: { $exists: true, $ne: null, $ne: '' },
      },
      'name rollNumber branch dateOfBirth'
    )
      .sort({ name: 1 })
      .lean();

    // Exclude any students whose dateOfBirth is whitespace or malformed
    const validStudents = students.filter(
      (s) => s.dateOfBirth && typeof s.dateOfBirth === 'string' && s.dateOfBirth.trim().length >= 8
    );

    const responsePayload = {
      success: true,
      count: validStudents.length,
      students: validStudents,
    };

    birthdayCache = {
      data: responsePayload,
      expiresAt: Date.now() + 30 * 1000, // 30 seconds
    };

    res.setHeader('X-Cache', 'MISS');
    res.json(responsePayload);
  } catch (error) {
    console.error('Error fetching student birthdays:', error);
    res.status(500).json({ message: 'Server error fetching birthdays' });
  }
};

module.exports = { registerStudent, checkRollNumber, getStudent, getAllStudents, getStudentBirthdays };
