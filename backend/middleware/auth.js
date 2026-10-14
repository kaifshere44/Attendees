const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-min-32-chars';
      const decoded = jwt.verify(token, jwtSecret);

      req.admin = await Admin.findById(decoded.id).select('-passwordHash');

      if (!req.admin) {
        return res.status(401).json({ message: 'Not authorized, admin not found' });
      }

      if (!req.admin.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Check if admin has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    next();
  };
};

module.exports = { protect, authorize };
