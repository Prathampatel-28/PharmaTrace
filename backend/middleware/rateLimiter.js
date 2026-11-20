const rateLimit = require('express-rate-limit');

// Strict rate limiter for authentication routes (login, register, forgot-password)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

// Rate limiter for QR verification to prevent token enumeration
const qrLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 120, // 120 queries per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Verification rate limit exceeded. Please try again shortly.' }
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Request limit reached. Please slow down.' }
});

module.exports = { authLimiter, qrLimiter, apiLimiter };
