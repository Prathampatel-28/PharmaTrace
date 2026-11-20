const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
    try {
        let token = null;

        // 1. Check HTTP-only cookie
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // 2. Check Authorization Bearer header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Authentication required. Please log in.' });
        }

        const secret = process.env.JWT_SECRET || 'pharmatrace_jwt_super_secure_secret_key_2026_academic_prod';
        const decoded = jwt.verify(token, secret);

        const user = await User.findById(decoded.id);
        if (!user || user.isDeleted) {
            return res.status(401).json({ message: 'User account not found or has been deleted.' });
        }

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact an administrator.' });
        }

        if (user.accountStatus === 'deactivated') {
            return res.status(403).json({ message: 'Your account has been deactivated.' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        return res.status(401).json({ message: 'Invalid authentication token.' });
    }
}

// Optional auth for public verification page (enables retailer actions if logged in)
async function optionalAuth(req, _res, next) {
    try {
        let token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
        if (token) {
            const secret = process.env.JWT_SECRET || 'pharmatrace_jwt_super_secure_secret_key_2026_academic_prod';
            const decoded = jwt.verify(token, secret);
            const user = await User.findById(decoded.id);
            if (user && !user.isDeleted && user.accountStatus === 'active') {
                req.user = user;
            }
        }
    } catch {
        // Continue unauthenticated
    }
    next();
}

module.exports = { authenticate, optionalAuth };
