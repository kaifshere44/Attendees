const rateLimit = require('express-rate-limit');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (permits admin polling)
  message: 'Too many requests from this IP, please try again later',
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 login attempts per windowMs
  message: 'Too many login attempts, please try again later',
});

// PIN verification rate limiter
const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 PIN attempts per windowMs
  message: 'Too many PIN attempts, please try again later',
});

module.exports = { generalLimiter, loginLimiter, pinLimiter };
