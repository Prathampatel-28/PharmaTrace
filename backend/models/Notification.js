const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    role: {
        type: String,
        enum: ['admin', 'manufacturer', 'retailer', 'customer', 'all'],
        default: 'all',
        index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'danger'],
        default: 'info'
    },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Notification', notificationSchema);
