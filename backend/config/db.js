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

    const uri = process.env.MONGODB_URI;
    const isRemoteAtlas = uri && (uri.startsWith('mongodb+srv://') || (!uri.includes('127.0.0.1') && !uri.includes('localhost')));

    // 1. If remote cloud MongoDB (MongoDB Atlas) is provided:
    if (isRemoteAtlas) {
        try {
            if (!cached.promise) {
                cached.promise = mongoose.connect(uri.trim(), {
                    dbName: 'pharmatrace',
                    serverSelectionTimeoutMS: 5000,
                    connectTimeoutMS: 8000,
                    bufferCommands: false
                }).then(m => m);
            }
            cached.conn = await cached.promise;
            mongoAvailable = true;
            connectionType = 'MongoDB Atlas (Cloud)';
            console.log('[Database] Connected to persistent MongoDB Atlas cluster at database "pharmatrace".');
            return cached.conn;
        } catch (err) {
            cached.promise = null;
            console.error('[Database Connection Error] Failed connecting to remote MongoDB Atlas:', err.message);
            mongoAvailable = false;
            connectionType = 'Atlas Error: ' + err.message;
            return null;
        }
    }

    // 2. On Vercel serverless without remote MONGODB_URI:
    if (process.env.VERCEL) {
        console.error('[CRITICAL] Running on Vercel without MONGODB_URI. Persistent MongoDB Atlas cluster is required for permanent data storage.');
        mongoAvailable = false;
        connectionType = 'Missing MONGODB_URI in Vercel Environment Variables';
        return null;
    }

    // 3. Local machine: attempt connecting to local native MongoDB port 27017
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/pharmatrace', {
            dbName: 'pharmatrace',
            serverSelectionTimeoutMS: 1500,
            bufferCommands: false
        });
        mongoAvailable = true;
        cached.conn = mongoose;
        connectionType = 'Local Native MongoDB (127.0.0.1:27017)';
        console.log('[Database] Connected to local MongoDB on port 27017 (pharmatrace).');
        return cached.conn;
    } catch (err) {
        // Native instance not running on 27017, start built-in MongoMemoryServer
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
