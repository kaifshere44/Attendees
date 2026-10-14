const Student = require('../models/Student');

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

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [
        { rollNumber: normalizedRollNumber },
        { email: normalizedEmail }
      ]
    });

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

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
      },
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Student with this roll number or email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if roll number exists
// @route   GET /api/students/check/:rollNumber
// @access  Public
const checkRollNumber = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const normalizedRollNumber = rollNumber.trim().toUpperCase();

    const student = await Student.findOne({ rollNumber: normalizedRollNumber });

    if (student) {
      res.json({
        success: true,
        exists: true,
        student: {
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
        },
      });
    } else {
      res.json({
        success: true,
        exists: false,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/me
// @access  Private (for student)
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

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

// @desc    Get all students (Super Admin only)
// @route   GET /api/students
// @access  Private (Super Admin)
const getAllStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const students = await Student.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments();

    res.json({
      success: true,
      students,
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

// @desc    Get students with birthdays (Standard Admin & Super Admin)
// @route   GET /api/students/birthdays
// @access  Private (ADMIN_STANDARD, ADMIN_SUPER)
const getStudentBirthdays = async (req, res) => {
  try {
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

    res.json({
      success: true,
      count: validStudents.length,
      students: validStudents,
    });
  } catch (error) {
    console.error('Error fetching student birthdays:', error);
    res.status(500).json({ message: 'Server error fetching birthdays' });
  }
};

module.exports = { registerStudent, checkRollNumber, getStudent, getAllStudents, getStudentBirthdays };
