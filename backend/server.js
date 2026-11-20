require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db');
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

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
    res.json({
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        service: 'PharmaTrace Enterprise API'
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

    app.listen(PORT, () => {
        console.log(`\n===============================================================`);
        console.log(`💊 PharmaTrace Enterprise Server live at: http://localhost:${PORT}`);
        console.log(`🔐 Security: Helmet, JWT HTTP-Only Cookies, Rate Limiting active`);
        console.log(`===============================================================\n`);
    });
}

startServer();
