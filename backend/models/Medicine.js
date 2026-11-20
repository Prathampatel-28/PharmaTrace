const mongoose = require('mongoose');

const checkpointSchema = new mongoose.Schema({
    stage: { type: String, required: true },
    status: { type: String, required: true },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updaterName: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const medicineSchema = new mongoose.Schema({
    medicineName: { type: String, required: true, trim: true },
    genericName: { type: String, default: '', trim: true },
    manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    manufacturerName: { type: String, required: true, trim: true },
    batchNumber: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    manufacturingDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    mfgDate: { type: String }, // Backward compatibility alias
    expDate: { type: String }, // Backward compatibility alias
    licenseNumber: { type: String, default: '', trim: true },
    composition: { type: String, default: '', trim: true },
    dosage: { type: String, default: '', trim: true },
    packaging: { type: String, default: 'Standard Blister Pack', trim: true },
    quantity: { type: Number, default: 1000 },
    productImage: { type: String, default: '' },
    storageInstructions: { type: String, default: 'Store in a cool, dry place below 25°C', trim: true },
    description: { type: String, default: '', trim: true },
    currentStatus: {
        type: String,
        enum: ['Manufactured', 'Received', 'In Stock', 'Sold', 'Recalled'],
        default: 'Manufactured',
        index: true
    },
    verificationToken: { type: String, required: true, unique: true, index: true },
    isRecalled: { type: Boolean, default: false, index: true },
    recallReason: { type: String, default: '' },
    recalledAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    checkpoints: { type: [checkpointSchema], default: [] }
}, { timestamps: true });

// Auto-sync mfgDate and expDate aliases
medicineSchema.pre('save', function (next) {
    if (this.manufacturingDate && !this.mfgDate) this.mfgDate = this.manufacturingDate;
    if (this.mfgDate && !this.manufacturingDate) this.manufacturingDate = this.mfgDate;
    if (this.expiryDate && !this.expDate) this.expDate = this.expiryDate;
    if (this.expDate && !this.expiryDate) this.expiryDate = this.expDate;
    if (this.currentStatus === 'Recalled') this.isRecalled = true;
    next();
});

module.exports = mongoose.model('Medicine', medicineSchema);
