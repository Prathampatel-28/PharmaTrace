const mongoose = require('mongoose');

const scanEventSchema = new mongoose.Schema({
    scannedAt: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    scannedByRole: { type: String, default: 'anonymous' },
    scannedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const qrVerificationSchema = new mongoose.Schema({
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchNumber: { type: String, required: true, index: true },
    verificationToken: { type: String, required: true, unique: true, index: true },
    scanCount: { type: Number, default: 0 },
    lastScannedAt: { type: Date, default: null },
    scans: { type: [scanEventSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('QRVerification', qrVerificationSchema);
