const express = require('express');
const router = express.Router();
const retailerController = require('../controllers/retailerController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate, authorize('retailer', 'admin'));

router.get('/batches', retailerController.getAvailableBatches);
router.put('/status/:id', retailerController.updateStatus);
router.get('/history', retailerController.getRetailerHistory);

module.exports = router;
