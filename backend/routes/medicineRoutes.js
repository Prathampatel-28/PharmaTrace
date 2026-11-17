const express = require('express');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');

const router = express.Router();

function isValidId(id) {
    return Boolean(id) && (mongoose.isValidObjectId(id) || /^[a-fA-F0-9]{24}$/.test(id));
}

router.post('/', async (req, res) => {
    try {
        const { medicineName, batchNumber, mfgDate, expDate } = req.body;

        if (!medicineName || !batchNumber || !mfgDate || !expDate) {
            return res.status(400).json({ message: 'All medicine fields are required.' });
        }

        if (new Date(expDate) <= new Date(mfgDate)) {
            return res.status(400).json({ message: 'Expiry date must be after manufacturing date.' });
        }

        const medicine = await Medicine.create({
            medicineName,
            batchNumber,
            mfgDate,
            expDate,
            currentStatus: 'Manufactured',
            checkpoints: [{
                stage: 'Manufacturer',
                status: 'Manufactured',
                location: 'Manufacturing facility',
                description: 'Batch registered by manufacturer',
                timestamp: new Date()
            }]
        });

        res.status(201).json(medicine);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'This batch number already exists. Please use a unique batch number.' });
        }
        res.status(500).json({ message: 'Could not register medicine.' });
    }
});

router.get('/', async (_req, res) => {
    try {
        const medicines = await Medicine.find();
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: 'Could not load medicines.' });
    }
});

router.get('/batch/:batchNumber', async (req, res) => {
    try {
        const batchNumber = req.params.batchNumber.trim().toUpperCase();
        const medicine = await Medicine.findOne({ batchNumber });

        if (!medicine) {
            return res.status(404).json({ message: `Medicine batch "${batchNumber}" was not found in the system.` });
        }

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Could not verify medicine.' });
    }
});

router.get('/:id/qr', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid medicine ID format.' });
        }

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        const baseUrl = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const verificationUrl = `${baseUrl}/customer.html?id=${medicine._id}`;

        const qrCode = await QRCode.toDataURL(verificationUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
        });

        res.json({ qrCode, verificationUrl });
    } catch (error) {
        res.status(500).json({ message: 'Could not generate QR code.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid medicine ID format.' });
        }

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Could not load medicine details.' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const { status, location, note = '' } = req.body;
        const allowedStatuses = ['Received', 'In Stock', 'Sold', 'Recalled'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Please select a valid status (Received, In Stock, Sold, Recalled).' });
        }

        if (!location || !location.trim()) {
            return res.status(400).json({ message: 'Retailer pharmacy name / location is required.' });
        }

        if (!isValidId(req.params.id)) {
            return res.status(400).json({ message: 'Invalid medicine ID format.' });
        }

        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found.' });
        }

        medicine.currentStatus = status;
        medicine.checkpoints.push({
            stage: 'Retailer',
            status: status,
            location: location.trim(),
            description: note.trim() || `Status updated to ${status}`,
            timestamp: new Date()
        });

        await medicine.save();
        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: 'Could not update medicine status.' });
    }
});

module.exports = router;
