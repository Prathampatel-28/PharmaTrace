const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'manufacturer', 'retailer', 'customer'],
        default: 'customer',
        index: true
    },
    phone: { type: String, default: '', trim: true },
    organization: { type: String, default: '', trim: true },
    licenseNumber: { type: String, default: '', trim: true },
    accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'deactivated'],
        default: 'active',
        index: true
    },
    isDeleted: { type: Boolean, default: false, index: true },
    lastLogin: { type: Date, default: null }
}, { timestamps: true });

// Prevent sensitive fields from leaking in JSON outputs
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
