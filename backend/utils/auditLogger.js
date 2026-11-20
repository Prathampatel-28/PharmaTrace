const AuditLog = require('../models/AuditLog');

async function logAudit({ performedBy, performerName, performerRole, action, targetType, targetId, previousData, updatedData, req }) {
    try {
        const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
        await AuditLog.create({
            performedBy: performedBy || req?.user?._id || null,
            performerName: performerName || req?.user?.name || 'System',
            performerRole: performerRole || req?.user?.role || 'system',
            action,
            targetType,
            targetId: String(targetId || ''),
            previousData,
            updatedData,
            ip
        });
    } catch (err) {
        console.error('Audit logging failed:', err.message);
    }
}

module.exports = { logAudit };
