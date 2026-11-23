const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB, getDatabaseStatus } = require('./config/db');
const { autoSeed } = require('./utils/autoSeeder');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const adminRoutes = require('./routes/adminRoutes');
const retailerRoutes = require('./routes/retailerRoutes');
const qrRoutes = require('./routes/qrRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security Headers (Configured so local scripts, QR images, and CDN assets load smoothly)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
    origin: true,
    credentials: true
}));

// Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serverless Database Connection & Initialization Middleware
let isInitialized = false;
app.use(async (_req, _res, next) => {
    if (!isInitialized) {
        try {
            await connectDB();
            await autoSeed();
            isInitialized = true;
        } catch (e) {
            console.error('Initialization error:', e);
        }
    }
    next();
});

// Protected Frontend Page Routes - Server-Side Access Control & Cache Prevention
const { verifyTokenDirect } = require('./middleware/auth');

function requirePageAuth(allowedRoles) {
    return (req, res, next) => {
        // Prevent browser caching of sensitive authenticated dashboard pages
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        let token = req.cookies?.token;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.redirect(`/login.html?redirect=${encodeURIComponent(req.originalUrl)}`);
        }

        const decoded = verifyTokenDirect(token);
        if (!decoded) {
            res.clearCookie('token');
            return res.redirect(`/login.html?redirect=${encodeURIComponent(req.originalUrl)}`);
        }

        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
            return res.redirect(`/login.html?redirect=${encodeURIComponent(req.originalUrl)}&roleMismatch=${encodeURIComponent(allowedRoles.join(','))}`);
        }

        next();
    };
}

// Intercept protected HTML dashboard requests before express.static serves them
app.get(['/manufacturer', '/manufacturer.html'], requirePageAuth(['manufacturer', 'admin']), (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'manufacturer.html'));
});

app.get(['/retailer', '/retailer.html'], requirePageAuth(['retailer', 'admin']), (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'retailer.html'));
});

app.get(['/admin', '/admin.html'], requirePageAuth(['admin']), (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html'));
});

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Explicit Root Route
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Mount API Routes with Rate Limiter
app.use('/api/', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/retailer', retailerRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check
app.get('/api/health', (_req, res) => {
    const dbStatus = getDatabaseStatus();
    res.json({
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        service: 'PharmaTrace Enterprise API',
        environment: process.env.NODE_ENV || 'development',
        deployment: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Local',
        database: {
            connected: dbStatus.isConnected,
            type: dbStatus.connectionType,
            name: dbStatus.databaseName,
            uriProvided: dbStatus.mongoUriConfigured
        }
    });
});

// Centralized Error Handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'An internal server error occurred. Please try again.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDB();
    await autoSeed();
    isInitialized = true;

    app.listen(PORT, () => {
        console.log(`\n===============================================================`);
        console.log(`💊 PharmaTrace Enterprise Server live at: http://localhost:${PORT}`);
        console.log(`🔐 Security: Helmet, JWT HTTP-Only Cookies, Rate Limiting active`);
        console.log(`===============================================================\n`);
    });
}

// In local environment, start HTTP server when run directly; in Vercel serverless, export app
if (require.main === module && !process.env.VERCEL) {
    startServer();
}

module.exports = app;
