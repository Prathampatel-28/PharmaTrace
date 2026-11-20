const express = require('express');
const router = express.Router();
const qrController = require('../controllers/qrController');
const { optionalAuth } = require('../middleware/auth');
const { qrLimiter } = require('../middleware/rateLimiter');

router.get('/:token', qrLimiter, optionalAuth, qrController.verifyToken);

module.exports = router;
