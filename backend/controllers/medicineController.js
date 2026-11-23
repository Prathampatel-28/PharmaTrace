const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const Medicine = require('../models/Medicine');
const TrackingHistory = require('../models/TrackingHistory');
const QRVerification = require('../models/QRVerification');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');
const { isMongoConnected } = require('../config/db');
const { getFallbackMedicines, addFallbackMedicine, findFallbackMedicine } = require('../utils/fallbackMedicines');

// Sanitizer for Public Medicine Endpoints (strips internal tokens, internal user IDs, and audit details)
function sanitizePublicMedicine(m) {
    if (!m) return null;
    return {
        _id: m._id,
        medicineName: m.medicineName,
        genericName: m.genericName || '',
        batchNumber: m.batchNumber,
        manufacturerName: m.manufacturerName,
        licenseNumber: m.licenseNumber || '',
        quantity: m.quantity || 1000,
        manufacturingDate: m.manufacturingDate || m.mfgDate,
        expiryDate: m.expiryDate || m.expDate,
        mfgDate: m.manufacturingDate || m.mfgDate,
        expDate: m.expiryDate || m.expDate,
        composition: m.composition || '',
        dosage: m.dosage || '',
        packaging: m.packaging || '',
        currentStatus: m.currentStatus,
        isRecalled: !!m.isRecalled,
        recallReason: m.recallReason || '',
        createdAt: m.createdAt || new Date()
    };
}

exports.createBatch = async (req, res) => {
    try {
        const {
            medicineName,
            genericName,
            batchNumber,
            manufacturingDate,
            mfgDate,
            expiryDate,
            expDate,
            licenseNumber,
            composition,
            dosage,
            packaging,
            quantity,
            productImage,
            storageInstructions,
            description
        } = req.body;

        const effectiveMfgDate = manufacturingDate || mfgDate;
        const effectiveExpDate = expiryDate || expDate;

        if (!medicineName || !batchNumber || !effectiveMfgDate || !effectiveExpDate) {
            return res.status(400).json({ message: 'Medicine name, batch number, manufacturing date, and expiry date are required.' });
        }

        if (new Date(effectiveExpDate) <= new Date(effectiveMfgDate)) {
            return res.status(400).json({ message: 'Expiry date must be after manufacturing date.' });
        }

        const normalizedBatch = batchNumber.trim().toUpperCase();

        if (isMongoConnected()) {
            const existing = await Medicine.findOne({ batchNumber: normalizedBatch, isDeleted: false });
            if (existing) {
                return res.status(409).json({ message: `Batch number "${normalizedBatch}" already exists. Please use a unique batch number.` });
            }
        } else {
            const existing = findFallbackMedicine(normalizedBatch);
            if (existing) {
                return res.status(409).json({ message: `Batch number "${normalizedBatch}" already exists. Please use a unique batch number.` });
            }
        }

        const verificationToken = crypto.randomBytes(16).toString('hex');
        const manufacturerOrg = req.user.organization || req.user.name || 'Certified Manufacturer';

        const initialCheckpoint = {
            stage: 'Manufacturer',
            status: 'Manufactured',
            location: manufacturerOrg,
            description: description ? `Registered: ${description}` : 'Batch registered and certified by manufacturer',
            updatedBy: req.user._id,
            updaterName: req.user.name,
            timestamp: new Date()
        };

        if (!isMongoConnected()) {
            if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
                return res.status(503).json({
                    message: 'Database Unavailable: Cannot register new medicine batches because the production MongoDB database is not connected. Please verify that MONGODB_URI is configured in your deployment settings.'
                });
            }
            const fallbackBatch = {
                _id: 'batch_' + Date.now(),
                medicineName: medicineName.trim(),
                genericName: (genericName || '').trim(),
                manufacturerId: req.user._id,
                manufacturerName: manufacturerOrg,
                batchNumber: normalizedBatch,
                manufacturingDate: effectiveMfgDate,
                expiryDate: effectiveExpDate,
                mfgDate: effectiveMfgDate,
                expDate: effectiveExpDate,
                licenseNumber: (licenseNumber || req.user.licenseNumber || '').trim(),
                composition: (composition || '').trim(),
                dosage: (dosage || '').trim(),
                packaging: (packaging || 'Standard Unit Blister').trim(),
                quantity: Number(quantity) || 1000,
                productImage: (productImage || '').trim(),
                storageInstructions: (storageInstructions || 'Store below 25°C in a dry place').trim(),
                description: (description || '').trim(),
                currentStatus: 'Manufactured',
                isRecalled: false,
                verificationToken,
                createdAt: new Date(),
                checkpoints: [initialCheckpoint]
            };
            addFallbackMedicine(fallbackBatch);
            return res.status(201).json(fallbackBatch);
        }

        const medicine = await Medicine.create({
            medicineName: medicineName.trim(),
            genericName: (genericName || '').trim(),
            manufacturerId: req.user._id,
            manufacturerName: manufacturerOrg,
            batchNumber: normalizedBatch,
            manufacturingDate: effectiveMfgDate,
            expiryDate: effectiveExpDate,
            mfgDate: effectiveMfgDate,
            expDate: effectiveExpDate,
            licenseNumber: (licenseNumber || req.user.licenseNumber || '').trim(),
            composition: (composition || '').trim(),
            dosage: (dosage || '').trim(),
            packaging: (packaging || 'Standard Unit Blister').trim(),
            quantity: Number(quantity) || 1000,
            productImage: (productImage || '').trim(),
            storageInstructions: (storageInstructions || 'Store below 25°C in a dry place').trim(),
            description: (description || '').trim(),
            currentStatus: 'Manufactured',
            verificationToken,
            checkpoints: [initialCheckpoint]
        });

        // Create tracking history record
        await TrackingHistory.create({
            medicineId: medicine._id,
            batchNumber: medicine.batchNumber,
            previousStatus: 'None',
            newStatus: 'Manufactured',
            updatedBy: req.user._id,
            updaterName: req.user.name,
            userRole: req.user.role,
            remarks: 'Initial batch registration',
            location: manufacturerOrg
        });

        // Initialize QR verification tracking
        await QRVerification.create({
            medicineId: medicine._id,
            batchNumber: medicine.batchNumber,
            verificationToken
        });

        // Notify manufacturer and admin
        await Notification.create({
            userId: req.user._id,
            role: 'manufacturer',
            title: 'Batch Registered',
            message: `Batch ${medicine.batchNumber} (${medicine.medicineName}) registered successfully.`,
            type: 'success',
            link: `customer.html?token=${verificationToken}`
        });

        await Notification.create({
            role: 'admin',
            title: 'New Batch in System',
            message: `${manufacturerOrg} registered batch ${medicine.batchNumber}.`,
            type: 'info'
        });

        // Log audit
        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'BATCH_REGISTERED',
            targetType: 'Medicine',
            targetId: medicine._id,
            updatedData: { batchNumber: medicine.batchNumber, name: medicine.medicineName, quantity: medicine.quantity },
            req
        });

        res.status(201).json(medicine);
    } catch (error) {
        console.error('Create batch error:', error);
        res.status(500).json({ message: 'Could not register medicine batch.' });
    }
};

exports.getAllMedicines = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;

        if (!isMongoConnected()) {
            let list = getFallbackMedicines();
            if (status) list = list.filter(m => m.currentStatus === status);
            if (search) {
                const s = search.toLowerCase();
                list = list.filter(m => (m.medicineName && m.medicineName.toLowerCase().includes(s)) || (m.batchNumber && m.batchNumber.toLowerCase().includes(s)));
            }
            return res.json({
                medicines: list.map(sanitizePublicMedicine),
                total: list.length,
                page: 1,
                pages: 1
            });
        }
        const query = { isDeleted: false };

        if (status) {
            query.currentStatus = status;
        }

        if (search) {
            query.$or = [
                { medicineName: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } },
                { genericName: { $regex: search, $options: 'i' } },
                { manufacturerName: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const medicines = await Medicine.find(query)
            .select('medicineName genericName batchNumber manufacturerName licenseNumber quantity manufacturingDate expiryDate mfgDate expDate currentStatus isRecalled recallReason createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Medicine.countDocuments(query);

        res.json({
            medicines,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Get medicines error, using resilient fallback:', error.message);
        let list = getFallbackMedicines();
        const { search, status } = req.query;
        if (status) list = list.filter(m => m.currentStatus === status);
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(m => (m.medicineName && m.medicineName.toLowerCase().includes(s)) || (m.batchNumber && m.batchNumber.toLowerCase().includes(s)));
        }
        res.json({
            medicines: list.map(sanitizePublicMedicine),
            total: list.length,
            page: 1,
            pages: 1
        });
    }
};

exports.getMyBatches = async (req, res) => {
    try {
        const userIdStr = req.user._id ? req.user._id.toString() : '';
        const isAdmin = req.user.role === 'admin';
        let batches = [];

        if (isMongoConnected()) {
            const query = isAdmin ? { isDeleted: false } : { manufacturerId: req.user._id, isDeleted: false };
            batches = await Medicine.find(query).sort({ createdAt: -1 });
        } else {
            const list = getFallbackMedicines();
            batches = isAdmin ? list : list.filter(m => m.manufacturerId && m.manufacturerId.toString() === userIdStr);
        }

        res.json(batches || []);
    } catch (error) {
        console.error('getMyBatches error:', error);
        res.status(500).json({ message: 'Could not fetch your registered batches.' });
    }
};

exports.getBatchById = async (req, res) => {
    try {
        const idParam = (req.params.id || '').trim();
        let medicine = null;
        if (isMongoConnected()) {
            medicine = await Medicine.findOne({ _id: idParam, isDeleted: false });
        }
        if (!medicine) {
            medicine = findFallbackMedicine(idParam);
        }
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine batch not found.' });
        }

        // Manufacturer data isolation: A manufacturer cannot inspect another manufacturer's batch via API
        if (req.user && req.user.role === 'manufacturer') {
            const userMfgId = req.user._id.toString();
            const medMfgId = medicine.manufacturerId ? medicine.manufacturerId.toString() : '';
            if (medMfgId && medMfgId !== userMfgId) {
                return res.status(403).json({ message: 'Forbidden: Access denied to another manufacturer\'s product.' });
            }
        }

        res.json(medicine);
    } catch (error) {
        const found = findFallbackMedicine(req.params.id);
        if (found) {
            if (req.user && req.user.role === 'manufacturer') {
                const userMfgId = req.user._id.toString();
                const medMfgId = found.manufacturerId ? found.manufacturerId.toString() : '';
                if (medMfgId && medMfgId !== userMfgId) {
                    return res.status(403).json({ message: 'Forbidden: Access denied to another manufacturer\'s product.' });
                }
            }
            return res.json(found);
        }
        res.status(404).json({ message: 'Medicine batch not found.' });
    }
};

exports.getBatchByNumber = async (req, res) => {
    try {
        const batchNumber = req.params.batchNumber.trim().toUpperCase();
        let medicine = null;
        if (isMongoConnected()) {
            medicine = await Medicine.findOne({ batchNumber, isDeleted: false });
        }
        if (!medicine) {
            medicine = findFallbackMedicine(batchNumber);
        }
        if (!medicine) {
            return res.status(404).json({ message: `Medicine batch "${batchNumber}" was not found.` });
        }
        res.json(sanitizePublicMedicine(medicine));
    } catch (error) {
        const found = findFallbackMedicine(req.params.batchNumber);
        if (found) return res.json(sanitizePublicMedicine(found));
        res.status(404).json({ message: `Medicine batch "${req.params.batchNumber}" was not found.` });
    }
};

exports.getQrCode = async (req, res) => {
    try {
        const idParam = (req.params.id || '').trim();
        let medicine = null;

        if (isMongoConnected()) {
            try {
                medicine = await Medicine.findOne({
                    $or: [
                        { _id: idParam.match(/^[0-9a-fA-F]{24}$/) ? idParam : null },
                        { verificationToken: idParam },
                        { batchNumber: idParam.toUpperCase() }
                    ],
                    isDeleted: false
                });
            } catch (e) {
                medicine = null;
            }
        }

        if (!medicine) {
            medicine = findFallbackMedicine(idParam);
        }

        if (!medicine) {
            return res.status(404).json({ message: `Medicine batch "${idParam}" not found.` });
        }

        // Ownership guard for manufacturers: A manufacturer cannot inspect another manufacturer's QR code
        if (req.user && req.user.role === 'manufacturer') {
            const userMfgId = req.user._id ? req.user._id.toString() : '';
            const medMfgId = medicine.manufacturerId ? medicine.manufacturerId.toString() : '';
            if (medMfgId && medMfgId !== userMfgId) {
                return res.status(403).json({ message: 'Forbidden: Access denied to another manufacturer\'s QR code.' });
            }
        }

        const token = medicine.verificationToken || medicine._id || medicine.batchNumber;
        const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const verificationUrl = `${baseUrl}/customer.html?token=${token}`;

        const qrCode = await QRCode.toDataURL(verificationUrl, {
            width: 320,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
        });

        res.json({
            qrCode,
            verificationUrl,
            batchNumber: medicine.batchNumber,
            medicineName: medicine.medicineName,
            token
        });
    } catch (error) {
        console.error('QR code generation error:', error);
        res.status(500).json({ message: 'Could not generate QR code.' });
    }
};

exports.updateBatch = async (req, res) => {
    try {
        const medicine = await Medicine.findOne({ _id: req.params.id, isDeleted: false });
        if (!medicine) return res.status(404).json({ message: 'Medicine batch not found.' });

        // Authorization check: only admin or the creating manufacturer
        const isAdmin = req.user.role === 'admin';
        const isOwner = medicine.manufacturerId && medicine.manufacturerId.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'You are not authorized to update this batch.' });
        }

        const previousData = {
            description: medicine.description,
            storageInstructions: medicine.storageInstructions,
            quantity: medicine.quantity
        };

        const { description, storageInstructions, quantity, dosage, packaging, genericName } = req.body;

        if (description !== undefined) medicine.description = description.trim();
        if (storageInstructions !== undefined) medicine.storageInstructions = storageInstructions.trim();
        if (quantity !== undefined) medicine.quantity = Number(quantity);
        if (dosage !== undefined) medicine.dosage = dosage.trim();
        if (packaging !== undefined) medicine.packaging = packaging.trim();
        if (genericName !== undefined) medicine.genericName = genericName.trim();

        await medicine.save();

        await logAudit({
            performedBy: req.user._id,
            performerName: req.user.name,
            performerRole: req.user.role,
            action: 'BATCH_UPDATED',
            targetType: 'Medicine',
            targetId: medicine._id,
            previousData,
            updatedData: { description: medicine.description, quantity: medicine.quantity },
            req
        });

        res.json({ message: 'Batch details updated successfully.', medicine });
    } catch (error) {
        res.status(500).json({ message: 'Could not update batch.' });
    }
};

exports.recallBatch = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: 'A specific reason for the medicine recall is required.' });
        }

        const idParam = (req.params.id || '').trim();
        let medicine = null;

        if (isMongoConnected()) {
            const queryOr = [
                { verificationToken: idParam },
                { batchNumber: idParam.toUpperCase() }
            ];
            if (idParam.match(/^[0-9a-fA-F]{24}$/)) {
                queryOr.push({ _id: idParam });
            }
            medicine = await Medicine.findOne({ $or: queryOr, isDeleted: false });
        } else {
            medicine = findFallbackMedicine(idParam);
        }

        if (!medicine) return res.status(404).json({ message: 'Medicine batch not found.' });

        // Authorization: Admin or the manufacturer who owns this batch
        const isAdmin = req.user.role === 'admin';
        const isOwner = medicine.manufacturerId && req.user._id && medicine.manufacturerId.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                message: 'Forbidden: You are not authorized to recall this batch. A manufacturer can only recall medicines produced by their own organization.'
            });
        }

        const previousStatus = medicine.currentStatus;
        medicine.currentStatus = 'Recalled';
        medicine.isRecalled = true;
        medicine.recallReason = reason.trim();
        medicine.recalledAt = new Date();

        const recallCheckpoint = {
            stage: 'Recall Notice',
            status: 'Recalled',
            location: req.user.organization || req.user.name || 'Regulatory / Manufacturer Office',
            description: `URGENT RECALL: ${reason.trim()}`,
            updatedBy: req.user._id,
            updaterName: req.user.name,
            timestamp: new Date()
        };

        if (!medicine.checkpoints) medicine.checkpoints = [];
        medicine.checkpoints.push(recallCheckpoint);

        if (typeof medicine.save === 'function') {
            await medicine.save();
        }

        // Record tracking history
        if (isMongoConnected()) {
            await TrackingHistory.create({
                medicineId: medicine._id,
                batchNumber: medicine.batchNumber,
                previousStatus,
                newStatus: 'Recalled',
                updatedBy: req.user._id,
                updaterName: req.user.name,
                userRole: req.user.role,
                remarks: `RECALL ISSUED: ${reason.trim()}`,
                location: req.user.organization || req.user.name || 'Headquarters'
            }).catch(() => {});

            // Broadcast urgent notification
            await Notification.create({
                role: 'all',
                title: `CRITICAL RECALL: ${medicine.medicineName}`,
                message: `Batch ${medicine.batchNumber} has been recalled by manufacturer ${req.user.name}. Reason: ${reason.trim()}`,
                type: 'danger',
                link: `customer.html?token=${medicine.verificationToken || medicine.batchNumber}`
            }).catch(() => {});

            await logAudit({
                performedBy: req.user._id,
                performerName: req.user.name,
                performerRole: req.user.role,
                action: 'BATCH_RECALLED',
                targetType: 'Medicine',
                targetId: medicine._id,
                previousData: { status: previousStatus },
                updatedData: { status: 'Recalled', reason: reason.trim() },
                req
            }).catch(() => {});
        }

        res.json({ message: 'Medicine batch successfully recalled.', medicine });
    } catch (error) {
        console.error('Recall error:', error);
        res.status(500).json({ message: 'Could not recall batch.' });
    }
};
