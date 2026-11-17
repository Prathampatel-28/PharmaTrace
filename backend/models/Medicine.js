const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { isMongoConnected } = require('../config/db');

const DATA_FILE = path.join(__dirname, '..', 'data', 'medicines.json');

const checkpointSchema = new mongoose.Schema({
    stage: { type: String, required: true },
    status: { type: String, required: true },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const medicineSchema = new mongoose.Schema({
    medicineName: { type: String, required: true, trim: true },
    batchNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    mfgDate: { type: String, required: true },
    expDate: { type: String, required: true },
    currentStatus: {
        type: String,
        enum: ['Manufactured', 'Received', 'In Stock', 'Sold', 'Recalled'],
        default: 'Manufactured'
    },
    checkpoints: { type: [checkpointSchema], default: [] }
}, { timestamps: true });

const MongoMedicine = mongoose.model('Medicine', medicineSchema);

function readLocalFile() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
            fs.writeFileSync(DATA_FILE, '[]', 'utf8');
            return [];
        }
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw || '[]');
    } catch (err) {
        return [];
    }
}

function writeLocalFile(data) {
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing file:', err.message);
    }
}

function wrapDoc(doc) {
    if (!doc) return null;
    return {
        ...doc,
        save: async function () {
            const list = readLocalFile();
            const index = list.findIndex(m => m._id === this._id);
            if (index !== -1) {
                list[index] = { ...this };
                delete list[index].save;
                writeLocalFile(list);
            }
            return this;
        }
    };
}

const Medicine = {
    async create(data) {
        if (isMongoConnected()) {
            return await MongoMedicine.create(data);
        }

        const list = readLocalFile();
        const duplicate = list.find(m => m.batchNumber.toUpperCase() === data.batchNumber.toUpperCase());
        if (duplicate) {
            const err = new Error('Duplicate batch');
            err.code = 11000;
            throw err;
        }

        const newDoc = {
            _id: crypto.randomBytes(12).toString('hex'),
            medicineName: data.medicineName,
            batchNumber: data.batchNumber.toUpperCase(),
            mfgDate: data.mfgDate,
            expDate: data.expDate,
            currentStatus: data.currentStatus || 'Manufactured',
            checkpoints: data.checkpoints || [],
            createdAt: new Date().toISOString()
        };

        list.unshift(newDoc);
        writeLocalFile(list);
        return wrapDoc(newDoc);
    },

    async find() {
        if (isMongoConnected()) {
            return await MongoMedicine.find().sort({ createdAt: -1 });
        }
        const list = readLocalFile();
        const sorted = list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sorted.map(wrapDoc);
    },

    async findById(id) {
        if (isMongoConnected()) {
            return await MongoMedicine.findById(id);
        }
        const list = readLocalFile();
        const found = list.find(m => m._id === String(id));
        return wrapDoc(found);
    },

    async findOne(query) {
        if (isMongoConnected()) {
            return await MongoMedicine.findOne(query);
        }
        const list = readLocalFile();
        if (query.batchNumber) {
            const target = String(query.batchNumber).toUpperCase();
            const found = list.find(m => m.batchNumber.toUpperCase() === target);
            return wrapDoc(found);
        }
        return null;
    }
};

module.exports = Medicine;
