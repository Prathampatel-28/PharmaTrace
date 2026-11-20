const mongoose = require('mongoose');

const trackingHistorySchema = new mongoose.Schema({
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchNumber: { type: String, required: true, index: true },
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updaterName: { type: String, default: '' },
    userRole: { type: String, required: true },
    remarks: { type: String, default: '' },
    location: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('TrackingHistory', trackingHistorySchema);
