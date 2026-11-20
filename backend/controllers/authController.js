const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');

function generateToken(user) {
    const secret = process.env.JWT_SECRET || 'pharmatrace_jwt_super_secure_secret_key_2026_academic_prod';
    return jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, phone, organization, licenseNumber } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Prevent self-registering as admin
        const assignedRole = ['manufacturer', 'retailer', 'customer'].includes(role) ? role : 'customer';

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({ message: 'An account with this email address already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: assignedRole,
            phone: (phone || '').trim(),
            organization: (organization || '').trim(),
            licenseNumber: (licenseNumber || '').trim(),
            accountStatus: 'active'
        });

        // Create welcome notification
        await Notification.create({
            userId: user._id,
            role: user.role,
            title: 'Welcome to PharmaTrace',
            message: `Your account as a ${user.role} has been created successfully.`,
            type: 'success'
        });

        // Audit log
        await logAudit({
            performedBy: user._id,
            performerName: user.name,
            performerRole: user.role,
            action: 'USER_REGISTERED',
            targetType: 'User',
            targetId: user._id,
            updatedData: { email: user.email, role: user.role, organization: user.organization },
            req
        });

        const token = generateToken(user);
        setAuthCookie(res, token);

        res.status(201).json({
            message: 'Registration successful.',
            token,
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user || user.isDeleted) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (user.accountStatus === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
        }

        if (user.accountStatus === 'deactivated') {
            return res.status(403).json({ message: 'This account has been deactivated.' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user);
        setAuthCookie(res, token);

        await logAudit({
            performedBy: user._id,
            performerName: user.name,
            performerRole: user.role,
            action: 'USER_LOGGED_IN',
            targetType: 'User',
            targetId: user._id,
            req
        });

        res.json({
            message: 'Login successful.',
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
};

exports.logout = async (req, res) => {
    try {
        res.clearCookie('token');
        if (req.user) {
            await logAudit({
                performedBy: req.user._id,
                performerName: req.user.name,
                performerRole: req.user.role,
                action: 'USER_LOGGED_OUT',
                targetType: 'User',
                targetId: req.user._id,
                req
            });
        }
        res.json({ message: 'Logged out successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Logout failed.' });
    }
};

exports.getMe = async (req, res) => {
    res.json({ user: req.user });
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, organization, licenseNumber } = req.body;
        const user = await User.findById(req.user._id);

        const previousData = { name: user.name, phone: user.phone, organization: user.organization };

        if (name) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (organization !== undefined) user.organization = organization.trim();
        if (licenseNumber !== undefined) user.licenseNumber = licenseNumber.trim();

        await user.save();

        await logAudit({
            performedBy: user._id,
            performerName: user.name,
            performerRole: user.role,
            action: 'PROFILE_UPDATED',
            targetType: 'User',
            targetId: user._id,
            previousData,
            updatedData: { name: user.name, phone: user.phone, organization: user.organization },
            req
        });

        res.json({ message: 'Profile updated successfully.', user });
    } catch (error) {
        res.status(500).json({ message: 'Could not update profile.' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        await logAudit({
            performedBy: user._id,
            performerName: user.name,
            performerRole: user.role,
            action: 'PASSWORD_CHANGED',
            targetType: 'User',
            targetId: user._id,
            req
        });

        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to change password.' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        const user = await User.findOne({ email: email.trim().toLowerCase(), isDeleted: false });
        if (!user) {
            // For security, do not disclose if email exists
            return res.json({ message: 'If an account exists with this email, a password reset link has been prepared.' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await PasswordResetToken.deleteMany({ userId: user._id });
        await PasswordResetToken.create({
            userId: user._id,
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

        // In production this sends an email; for academic prototype we return the token
        res.json({
            message: 'Password reset token generated successfully.',
            resetToken: rawToken,
            instructions: 'Use this reset token on the reset password screen to set a new password.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Password reset request failed.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Reset token and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const resetRecord = await PasswordResetToken.findOne({
            tokenHash,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetRecord) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        const user = await User.findById(resetRecord.userId);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        resetRecord.used = true;
        await resetRecord.save();

        await logAudit({
            performedBy: user._id,
            performerName: user.name,
            performerRole: user.role,
            action: 'PASSWORD_RESET_COMPLETED',
            targetType: 'User',
            targetId: user._id,
            req
        });

        res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: 'Password reset failed.' });
    }
};
