const mongoose = require('mongoose');

// Disable operation buffering so queries fail immediately if database is offline instead of hanging
mongoose.set('bufferCommands', false);

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

let mongoServer = null;
let mongoAvailable = false;
let connectionType = 'Disconnected';

async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        mongoAvailable = true;
        return cached.conn;
    }

    const localUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmatrace';

    // 1. Attempt connecting to local MongoDB (port 27017)
    try {
        await mongoose.connect(localUri, {
            dbName: 'pharmatrace',
            serverSelectionTimeoutMS: 2000,
            bufferCommands: false
        });
        mongoAvailable = true;
        cached.conn = mongoose;
        connectionType = 'Local Native MongoDB (127.0.0.1:27017)';
        console.log(`[Database] Connected to local MongoDB at ${localUri}`);
        return cached.conn;
    } catch (err) {
        // Native instance not running on 27017, start built-in MongoMemoryServer fallback
    }

    // 4. Local machine: start built-in MongoMemoryServer on port 27017 for Compass & local testing
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
        await mongoose.connect(memoryUri, { dbName: 'pharmatrace', bufferCommands: false });
        mongoAvailable = true;
        cached.conn = mongoose;
        connectionType = 'Local Development MongoDB (127.0.0.1:27017)';
        console.log('[Database] Local MongoDB server running at mongodb://127.0.0.1:27017/pharmatrace');
        return cached.conn;
    } catch (error) {
        console.error('[Database] Failed to start local MongoDB on port 27017:', error.message);
        mongoAvailable = false;
        connectionType = 'Local Failed: ' + error.message;
    }

    return null;
}

function isMongoConnected() {
    return mongoAvailable && mongoose.connection.readyState === 1;
}

function getDatabaseStatus() {
    return {
        isConnected: isMongoConnected(),
        connectionType,
        databaseName: 'pharmatrace',
        readyState: mongoose.connection.readyState,
        mongoUriConfigured: Boolean(process.env.MONGODB_URI)
    };
}

module.exports = { connectDB, isMongoConnected, getDatabaseStatus };
