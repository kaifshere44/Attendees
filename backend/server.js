const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const issueRoutes = require('./routes/issueRoutes');

const app = express();

// Initialize MongoDB connection
connectDB().catch((err) => {
  console.error('Initial MongoDB connection error:', err.message);
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Middleware to ensure DB connection is active for each request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed on request:', error.message);
    res.status(503).json({ success: false, message: 'Database connection failed. Please try again shortly.' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/issues', issueRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', env: process.env.NODE_ENV });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

