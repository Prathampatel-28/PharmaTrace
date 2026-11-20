const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performerName: { type: String, default: 'System' },
    performerRole: { type: String, default: 'system' },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['User', 'Medicine', 'System'], required: true },
    targetId: { type: String, default: '' },
    previousData: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedData: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
