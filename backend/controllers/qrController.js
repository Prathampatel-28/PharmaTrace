const Medicine = require('../models/Medicine');
const QRVerification = require('../models/QRVerification');
const TrackingHistory = require('../models/TrackingHistory');
const { isMongoConnected } = require('../config/db');
const { getFallbackMedicines, findFallbackMedicine } = require('../utils/fallbackMedicines');

exports.verifyToken = async (req, res) => {
    try {
        const tokenOrId = req.params.token.trim();

        if (!isMongoConnected()) {
            const found = findFallbackMedicine(tokenOrId);
            if (found) {
                return res.json({
                    isAuthentic: true,
                    medicine: {
                        ...found,
                        manufacturingDate: found.manufacturingDate || found.mfgDate,
                        expiryDate: found.expiryDate || found.expDate,
                        isExpired: new Date(found.expiryDate || found.expDate) < new Date(),
                        verificationToken: found.verificationToken || found._id,
                        checkpoints: found.checkpoints || []
                    },
                    scanCount: 1,
                    lastScannedAt: new Date(),
                    trackingHistory: (found.checkpoints || []).map(cp => ({
                        ...cp,
                        newStatus: cp.status,
                        updaterName: cp.location,
                        userRole: cp.stage ? cp.stage.toLowerCase() : 'system'
                    })),
                    retailerActionsAvailable: req.user ? ['retailer', 'admin'].includes(req.user.role) : false,
                    userRole: req.user ? req.user.role : 'anonymous'
                });
            }
            return res.status(404).json({ isAuthentic: false, message: 'Invalid verification token.' });
        }

        // 1. Look up by verificationToken, OR by _id, OR by batchNumber
        const query = {
            $or: [
                { verificationToken: tokenOrId },
                { batchNumber: tokenOrId.toUpperCase() }
            ],
            isDeleted: false
        };

        if (tokenOrId.match(/^[0-9a-fA-F]{24}$/)) {
            query.$or.push({ _id: tokenOrId });
        }

        const medicine = await Medicine.findOne(query);

        if (!medicine) {
            return res.status(404).json({
                isAuthentic: false,
                message: 'COUNTERFEIT ALERT / INVALID BATCH: This verification token or batch number was NOT found in the registered pharmaceutical registry.'
            });
        }

        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        // Record scan event
        await QRVerification.findOneAndUpdate(
            { medicineId: medicine._id },
            {
                $inc: { scanCount: 1 },
                $set: { lastScannedAt: new Date() },
                $push: {
                    scans: {
                        scannedAt: new Date(),
                        ip,
                        userAgent,
                        scannedByRole: req.user ? req.user.role : 'anonymous',
                        scannedByUserId: req.user ? req.user._id : null
                    }
                }
            },
            { upsert: true }
        );

        // Fetch detailed tracking history and sanitize to prevent leaking internal database ObjectIds
        const rawTrackingHistory = await TrackingHistory.find({ medicineId: medicine._id }).sort({ timestamp: -1 });

        const safeCheckpoints = (medicine.checkpoints || []).map(cp => ({
            stage: cp.stage || 'Checkpoint',
            status: cp.status,
            location: cp.location || '',
            description: cp.description || '',
            timestamp: cp.timestamp
        }));

        const trackingHistory = rawTrackingHistory.map(th => ({
            stage: th.userRole ? (th.userRole.charAt(0).toUpperCase() + th.userRole.slice(1)) : 'Checkpoint',
            previousStatus: th.previousStatus,
            newStatus: th.newStatus,
            location: th.location || '',
            remarks: th.remarks || '',
            timestamp: th.timestamp,
            userRole: th.userRole
        }));

        const isExpired = new Date(medicine.expiryDate) < new Date();

        res.json({
            isAuthentic: true,
            medicine: {
                _id: medicine._id,
                medicineName: medicine.medicineName,
                genericName: medicine.genericName,
                batchNumber: medicine.batchNumber,
                manufacturingDate: medicine.manufacturingDate || medicine.mfgDate,
                expiryDate: medicine.expiryDate || medicine.expDate,
                manufacturerName: medicine.manufacturerName,
                licenseNumber: medicine.licenseNumber,
                composition: medicine.composition,
                dosage: medicine.dosage,
                packaging: medicine.packaging,
                storageInstructions: medicine.storageInstructions,
                description: medicine.description,
                currentStatus: medicine.currentStatus,
                isRecalled: medicine.isRecalled,
                recallReason: medicine.recallReason,
                isExpired,
                verificationToken: medicine.verificationToken,
                checkpoints: safeCheckpoints
            },
            trackingHistory,
            retailerActionsAvailable: req.user ? ['retailer', 'admin'].includes(req.user.role) : false,
            userRole: req.user ? req.user.role : 'anonymous'
        });
    } catch (error) {
        console.error('QR verification error, checking fallback dataset:', error.message);
        const list = getFallbackMedicines();
        const found = list.find(m => m.batchNumber === tokenOrId.toUpperCase() || m._id === tokenOrId);
        if (found) {
            return res.json({
                isAuthentic: true,
                medicine: {
                    ...found,
                    manufacturingDate: found.mfgDate,
                    expiryDate: found.expDate,
                    isExpired: new Date(found.expDate) < new Date(),
                    verificationToken: found._id,
                    checkpoints: found.checkpoints || []
                },
                scanCount: 1,
                lastScannedAt: new Date(),
                trackingHistory: (found.checkpoints || []).map(cp => ({
                    ...cp,
                    newStatus: cp.status,
                    updaterName: cp.location,
                    userRole: cp.stage ? cp.stage.toLowerCase() : 'system'
                })),
                retailerActionsAvailable: req.user ? ['retailer', 'admin'].includes(req.user.role) : false,
                userRole: req.user ? req.user.role : 'anonymous'
            });
        }
        res.status(404).json({ isAuthentic: false, message: 'Invalid verification token.' });
    }
};
