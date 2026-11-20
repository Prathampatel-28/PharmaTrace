const User = require('../models/User');
const Medicine = require('../models/Medicine');
const TrackingHistory = require('../models/TrackingHistory');
const QRVerification = require('../models/QRVerification');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');

exports.getDashboardStats = async (_req, res) => {
    try {
        const [
            totalUsers,
            totalManufacturers,
            totalRetailers,
            totalCustomers,
            suspendedAccounts,
            totalBatches,
            totalRecalled,
            totalSold,
            qrScans
        ] = await Promise.all([
            User.countDocuments({ isDeleted: false }),
            User.countDocuments({ role: 'manufacturer', isDeleted: false }),
            User.countDocuments({ role: 'retailer', isDeleted: false }),
            User.countDocuments({ role: 'customer', isDeleted: false }),
            User.countDocuments({ accountStatus: 'suspended', isDeleted: false }),
            Medicine.countDocuments({ isDeleted: false }),
            Medicine.countDocuments({ $or: [{ currentStatus: 'Recalled' }, { isRecalled: true }], isDeleted: false }),
            Medicine.countDocuments({ currentStatus: 'Sold', isDeleted: false }),
            QRVerification.aggregate([{ $group: { _id: null, totalScans: { $sum: '$scanCount' } } }])
        ]);

        const totalVerified = qrScans.length > 0 ? qrScans[0].totalScans : 0;

        res.json({
            totalUsers,
            totalManufacturers,
            totalRetailers,
            totalCustomers,
            suspendedAccounts,
            totalBatches,
            totalRecalled,
            totalSold,
            totalVerified
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Could not fetch admin statistics.' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 50 } = req.query;
        const query = { isDeleted: false };

        if (role) query.role = role;
        if (status) query.accountStatus = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { organization: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
        const total = await User.countDocuments(query);

        res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        res.status(500).json({ message: 'Could not load users.' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, role, phone, organization, licenseNumber, accountStatus } = req.body;
        const user = await User.findById(req.params.id);

        if (!user || user.isDeleted) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const previousData = {
            name: user.name,
            role: user.role,
            accountStatus: user.accountStatus,
            organization: user.organization
        };

        if (name) user.name = name.trim();
        if (role && ['admin', 'manufacturer', 'retailer', 'customer'].includes(role)) {
            user.role = role;
        }
        if (phone !== undefined) user.phone = phone.trim();
        if (organization !== undefined) user.organization = organization.trim();
        if (licenseNumber !== undefined) user.licenseNumber = licenseNumber.trim();
        if (accountStatus && ['active', 'suspended', 'deactivated'].includes(accountStatus)) {
            user.accountStatus = accountStatus;
        }

        await user.save();

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'USER_UPDATED_BY_ADMIN',
            targetType: 'User',
            targetId: user._id,
            previousData,
            updatedData: { name: user.name, role: user.role, status: user.accountStatus },
            req
        });

        res.json({ message: 'User updated successfully.', user });
    } catch (error) {
        res.status(500).json({ message: 'Could not update user.' });
    }
};

exports.toggleAccountStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'suspended', 'deactivated'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }

        const user = await User.findById(req.params.id);
        if (!user || user.isDeleted) return res.status(404).json({ message: 'User not found.' });

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change the status of your own admin account.' });
        }

        const previousStatus = user.accountStatus;
        user.accountStatus = status;
        await user.save();

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: status === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_ACTIVATED',
            targetType: 'User',
            targetId: user._id,
            previousData: { status: previousStatus },
            updatedData: { status },
            req
        });

        // Notify user
        await Notification.create({
            userId: user._id,
            title: `Account Status: ${status.toUpperCase()}`,
            message: `Your PharmaTrace account has been marked as ${status} by system administration.`,
            type: status === 'active' ? 'success' : 'danger'
        });

        res.json({ message: `Account status updated to ${status}.`, user });
    } catch (error) {
        res.status(500).json({ message: 'Could not update account status.' });
    }
};

exports.softDeleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.isDeleted) return res.status(404).json({ message: 'User not found.' });

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own admin account.' });
        }

        user.isDeleted = true;
        user.accountStatus = 'deactivated';
        await user.save();

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'USER_SOFT_DELETED',
            targetType: 'User',
            targetId: user._id,
            previousData: { email: user.email, name: user.name },
            req
        });

        res.json({ message: 'User has been safely soft-deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Could not delete user.' });
    }
};

exports.getMedicines = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const query = {};

        if (status) query.currentStatus = status;
        if (search) {
            query.$or = [
                { medicineName: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } },
                { genericName: { $regex: search, $options: 'i' } },
                { manufacturerName: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const medicines = await Medicine.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
        const total = await Medicine.countDocuments(query);

        res.json({ medicines, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        res.status(500).json({ message: 'Could not load medicines.' });
    }
};

exports.softDeleteMedicine = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine || medicine.isDeleted) return res.status(404).json({ message: 'Medicine batch not found.' });

        medicine.isDeleted = true;
        await medicine.save();

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'MEDICINE_SOFT_DELETED',
            targetType: 'Medicine',
            targetId: medicine._id,
            previousData: { batchNumber: medicine.batchNumber, name: medicine.medicineName },
            req
        });

        res.json({ message: `Batch ${medicine.batchNumber} has been soft-deleted.` });
    } catch (error) {
        res.status(500).json({ message: 'Could not delete medicine batch.' });
    }
};

exports.restoreMedicine = async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ message: 'Medicine not found.' });

        medicine.isDeleted = false;
        await medicine.save();

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'MEDICINE_RESTORED',
            targetType: 'Medicine',
            targetId: medicine._id,
            req
        });

        res.json({ message: `Batch ${medicine.batchNumber} has been restored.` });
    } catch (error) {
        res.status(500).json({ message: 'Could not restore medicine.' });
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { action: { $regex: search, $options: 'i' } },
                { performerName: { $regex: search, $options: 'i' } },
                { targetType: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const logs = await AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(Number(limit));
        const total = await AuditLog.countDocuments(query);

        res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (error) {
        res.status(500).json({ message: 'Could not load audit logs.' });
    }
};

exports.getAnalytics = async (_req, res) => {
    try {
        // 1. Status distribution
        const statusDistribution = await Medicine.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
        ]);

        // 2. Manufacturer batch count
        const manufacturerDistribution = await Medicine.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$manufacturerName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 7 }
        ]);

        // 3. User roles distribution
        const roleDistribution = await User.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // 4. Monthly batch registrations (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyRegistrations = await Medicine.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo }, isDeleted: false } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            statusDistribution,
            manufacturerDistribution,
            roleDistribution,
            monthlyRegistrations
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Could not load analytics data.' });
    }
};
