const mongoose = require('mongoose');

// Disable operation buffering so queries never hang if database is offline or unconfigured
mongoose.set('bufferCommands', false);

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

let mongoServer = null;
let mongoAvailable = false;

async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        mongoAvailable = true;
        return cached.conn;
    }

    const uri = process.env.MONGODB_URI;

    // 1. If explicit MONGODB_URI is provided (e.g. MongoDB Atlas on Vercel or locally)
    if (uri) {
        try {
            if (!cached.promise) {
                cached.promise = mongoose.connect(uri, {
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 10000,
                    bufferCommands: false
                }).then(m => m);
            }
            cached.conn = await cached.promise;
            mongoAvailable = true;
            console.log('Connected to remote MongoDB successfully.');
            return cached.conn;
        } catch (err) {
            cached.promise = null;
            console.error('Remote MongoDB connection error:', err.message);
            mongoAvailable = false;
            return null;
        }
    }

    // 2. On Vercel serverless without MONGODB_URI:
    // Standalone mongod binaries cannot run inside serverless containers.
    if (process.env.VERCEL) {
        console.warn('Running on Vercel serverless without MONGODB_URI. Operating with resilient dataset fallback.');
        mongoAvailable = false;
        return null;
    }

    // 3. Local machine: attempt connecting to local MongoDB port 27017
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/pharmatrace', {
            serverSelectionTimeoutMS: 1500,
            bufferCommands: false
        });
        mongoAvailable = true;
        cached.conn = mongoose;
        console.log('Connected to local MongoDB on port 27017.');
        return cached.conn;
    } catch (err) {
        // Native instance not running on 27017, start built-in MongoMemoryServer
    }

    // 4. Local machine: start built-in MongoMemoryServer on port 27017 for Compass
    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!mongoServer) {
            mongoServer = await MongoMemoryServer.create({
                instance: {
                    port: 27017,
                    dbName: 'pharmatrace'
                }
            });
        }
        const memoryUri = 'mongodb://127.0.0.1:27017/pharmatrace';
        await mongoose.connect(memoryUri, { bufferCommands: false });
        mongoAvailable = true;
        cached.conn = mongoose;
        console.log('MongoDB server running at mongodb://127.0.0.1:27017/pharmatrace');
        return cached.conn;
    } catch (error) {
        console.error('Failed to start MongoDB server on port 27017:', error.message);
        mongoAvailable = false;
    }

    return null;
}

function isMongoConnected() {
    return mongoAvailable && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isMongoConnected };
