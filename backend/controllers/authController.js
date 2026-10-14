const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const admin = await Admin.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(403).json({ message: 'Account is temporarily locked due to too many failed attempts' });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      admin.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (admin.failedLoginAttempts >= 5) {
        admin.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
      }

      await admin.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset failed login attempts on successful login
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = Date.now();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current admin
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-passwordHash');

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get Standard Admin details (Super Admin only)
// @route   GET /api/auth/standard-admin
// @access  Private (Super Admin)
const getStandardAdmin = async (req, res) => {
  try {
    const standardAdmin = await Admin.findOne({ role: 'ADMIN_STANDARD' }).select('-passwordHash');

    if (!standardAdmin) {
      return res.status(404).json({ message: 'Standard Admin account not found' });
    }

    res.json({
      success: true,
      admin: {
        id: standardAdmin._id,
        username: standardAdmin.username,
        email: standardAdmin.email,
        role: standardAdmin.role,
        isActive: standardAdmin.isActive,
        lastLogin: standardAdmin.lastLogin,
        createdAt: standardAdmin.createdAt,
        updatedAt: standardAdmin.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching Standard Admin:', error);
    res.status(500).json({ message: 'Server error fetching Standard Admin' });
  }
};

// @desc    Update Standard Admin credentials (Super Admin only)
// @route   PUT /api/auth/standard-admin/credentials
// @access  Private (Super Admin)
const updateStandardAdminCredentials = async (req, res) => {
  try {
    const { username, newPassword, confirmPassword } = req.body;

    const standardAdmin = await Admin.findOne({ role: 'ADMIN_STANDARD' });

    if (!standardAdmin) {
      return res.status(404).json({ message: 'Standard Admin account not found' });
    }

    if (!username && !newPassword) {
      return res.status(400).json({ message: 'Please provide a username or a new password to update' });
    }

    // 1. Update username if provided
    if (username) {
      const trimmedUsername = username.trim();

      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
      }

      const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!usernameRegex.test(trimmedUsername)) {
        return res.status(400).json({ message: 'Username can only contain letters, numbers, underscores, hyphens, and dots' });
      }

      // Check if username is already taken by another admin
      const existingUser = await Admin.findOne({
        username: trimmedUsername,
        _id: { $ne: standardAdmin._id },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username is already in use by another admin' });
      }

      standardAdmin.username = trimmedUsername;
    }

    // 2. Update password if provided
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation password do not match' });
      }

      // Setting passwordHash triggers the pre('save') hook to hash it with bcrypt
      standardAdmin.passwordHash = newPassword;

      // Reset any lockouts or failed attempts on authorized password reset
      standardAdmin.failedLoginAttempts = 0;
      standardAdmin.lockUntil = undefined;
    }

    await standardAdmin.save();

    console.log(`[AUDIT LOG] Super Admin ${req.admin?.username || 'unknown'} updated Standard Admin credentials: { username: '${standardAdmin.username}', passwordUpdated: ${!!newPassword} }`);

    res.json({
      success: true,
      message: 'Standard Admin credentials updated successfully',
      admin: {
        id: standardAdmin._id,
        username: standardAdmin.username,
        email: standardAdmin.email,
        role: standardAdmin.role,
        updatedAt: standardAdmin.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating Standard Admin credentials:', error);
    res.status(500).json({ message: 'Server error updating credentials' });
  }
};

module.exports = { loginAdmin, getMe, getStandardAdmin, updateStandardAdminCredentials };
