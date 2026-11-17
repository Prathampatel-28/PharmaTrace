const mongoose = require('mongoose');

let mongoAvailable = false;

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmatrace';

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 1000 });
        mongoAvailable = true;
        console.log('Connected to MongoDB successfully.');
    } catch (error) {
        mongoAvailable = false;
        console.log('Using local JSON file storage (backend/data/medicines.json).');
    }
}

function isMongoConnected() {
    return mongoAvailable;
}

module.exports = { connectDB, isMongoConnected };
