const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;
let mongoAvailable = false;

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmatrace';

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
        mongoAvailable = true;
        console.log('Connected to existing MongoDB on port 27017.');
        return;
    } catch (err) {
        // Native instance not running on 27017, start built-in instance
    }

    try {
        mongoServer = await MongoMemoryServer.create({
            instance: {
                port: 27017,
                dbName: 'pharmatrace'
            }
        });
        const memoryUri = 'mongodb://127.0.0.1:27017/pharmatrace';
        await mongoose.connect(memoryUri);
        mongoAvailable = true;
        console.log('MongoDB server running at mongodb://127.0.0.1:27017/pharmatrace');
    } catch (error) {
        console.error('Failed to start MongoDB server on port 27017:', error.message);
        mongoAvailable = false;
    }
}

function isMongoConnected() {
    return mongoAvailable;
}

module.exports = { connectDB, isMongoConnected };
