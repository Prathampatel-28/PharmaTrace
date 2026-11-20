const path = require('path');
const fs = require('fs');
const Medicine = require('../models/Medicine');
const TrackingHistory = require('../models/TrackingHistory');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');
const { isMongoConnected } = require('../config/db');

function getFallbackMedicines() {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'medicines.json');
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch { }
    return [];
}

exports.getAvailableBatches = async (req, res) => {
    if (!isMongoConnected()) {
        return res.json(getFallbackMedicines());
    }
    try {
        const batches = await Medicine.find({ isDeleted: false })
            .select('medicineName batchNumber currentStatus manufacturingDate expiryDate manufacturerName composition packaging isRecalled')
            .sort({ createdAt: -1 });
        res.json(batches);
    } catch (error) {
        res.json(getFallbackMedicines());
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status, location, note, remarks } = req.body;
        const allowedStatuses = ['Received', 'In Stock', 'Sold', 'Recalled'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be Received, In Stock, Sold, or Recalled.' });
        }

        const effectiveLocation = (location || req.user.organization || req.user.name || '').trim();
        if (!effectiveLocation) {
            return res.status(400).json({ message: 'Retailer pharmacy name / city location is required.' });
        }

        const medicine = await Medicine.findOne({
            $or: [
                { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
                { verificationToken: req.params.id },
                { batchNumber: req.params.id.toUpperCase() }
            ],
            isDeleted: false
        });

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine batch not found.' });
        }

        // Strict Status Transition Rules:
        if (medicine.isRecalled || medicine.currentStatus === 'Recalled') {
            if (status !== 'Recalled') {
                return res.status(400).json({
                    message: 'SECURITY ALERT: This batch has been officially RECALLED. It cannot be marked as In Stock or Sold.'
                });
            }
        }

        if (medicine.currentStatus === 'Sold' && status !== 'Recalled') {
            return res.status(400).json({
                message: 'This batch has already been marked as Sold to a customer and cannot be returned to shelf stock.'
            });
        }

        const previousStatus = medicine.currentStatus;
        medicine.currentStatus = status;

        if (status === 'Recalled') {
            medicine.isRecalled = true;
            medicine.recallReason = remarks || note || 'Retailer flagged safety issue';
            medicine.recalledAt = new Date();
        }

        const effectiveNote = (note || remarks || `Status updated to ${status} by ${req.user.name}`).trim();

        const newCheckpoint = {
            stage: 'Retailer',
            status,
            location: effectiveLocation,
            description: effectiveNote,
            updatedBy: req.user._id,
            updaterName: req.user.name,
            timestamp: new Date()
        };

        medicine.checkpoints.push(newCheckpoint);
        await medicine.save();

        // Create tracking history
        const tracking = await TrackingHistory.create({
            medicineId: medicine._id,
            batchNumber: medicine.batchNumber,
            previousStatus,
            newStatus: status,
            updatedBy: req.user._id,
            updaterName: req.user.name,
            userRole: req.user.role,
            remarks: effectiveNote,
            location: effectiveLocation
        });

        // Notifications
        if (status === 'Recalled') {
            await Notification.create({
                role: 'all',
                title: `RECALL ALERT: ${medicine.medicineName}`,
                message: `Retailer ${req.user.name} at ${effectiveLocation} flagged batch ${medicine.batchNumber} as Recalled.`,
                type: 'danger',
                link: `customer.html?token=${medicine.verificationToken}`
            });
        } else if (medicine.manufacturerId) {
            await Notification.create({
                userId: medicine.manufacturerId,
                role: 'manufacturer',
                title: `Batch Movement: ${medicine.batchNumber}`,
                message: `Batch ${medicine.batchNumber} status updated to "${status}" at ${effectiveLocation}.`,
                type: 'info'
            });
        }

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'STATUS_UPDATED',
            targetType: 'Medicine',
            targetId: medicine._id,
            previousData: { status: previousStatus },
            updatedData: { status, location: effectiveLocation, note: effectiveNote },
            req
        });

        res.json({
            message: `Medicine status successfully updated to "${status}".`,
            medicine,
            tracking
        });
    } catch (error) {
        console.error('Retailer status update error:', error);
        res.status(500).json({ message: 'Could not update medicine status.' });
    }
};

exports.getRetailerHistory = async (req, res) => {
    try {
        const history = await TrackingHistory.find({ updatedBy: req.user._id })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Could not load retailer history.' });
    }
};
