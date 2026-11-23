const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV;

// 1. Dedicated Rate Limiter for Login Endpoint (brute-force mitigation)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 15 : 150, // 15 failed attempts in production, 150 in dev
    standardHeaders: true,
    legacyHeaders: false,
    // CRITICAL: Successful logins (2xx) are NOT penalized
    skipSuccessfulRequests: true,
    message: { message: 'Too many failed login attempts. Please wait 15 minutes before trying again.' }
});

// 2. Rate Limiter for Registration and Password Reset
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 30 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: 'Too many authentication requests. Please try again after 15 minutes.' }
});

// 3. Rate Limiter for QR Code Verification (prevents token scanning floods)
const qrLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: isProduction ? 150 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Verification rate limit exceeded. Please try again shortly.' }
});

// 4. General API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 1000 : 10000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Never allow general API limiter to intercept login or logout or health checks
        const path = req.originalUrl || req.url || '';
        if (path.includes('/api/auth/login') || path.includes('/api/auth/logout') || path.includes('/api/health')) {
            return true;
        }
        return false;
    },
    message: { message: 'API request limit reached. Please wait a moment and try again.' }
});

module.exports = { authLimiter, loginLimiter, qrLimiter, apiLimiter };
