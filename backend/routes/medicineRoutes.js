const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const retailerController = require('../controllers/retailerController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// 1. Fixed subpath endpoints
router.get('/', medicineController.getAllMedicines);
router.get('/batch/:batchNumber', medicineController.getBatchByNumber);
router.get('/my/batches', authenticate, authorize('manufacturer', 'admin'), medicineController.getMyBatches);
router.get('/my-batches', authenticate, authorize('manufacturer', 'admin'), medicineController.getMyBatches);

// 2. Specific batch actions & parameterized routes
router.post('/', authenticate, authorize('manufacturer', 'admin'), medicineController.createBatch);
router.get('/:id/qr', authenticate, authorize('manufacturer', 'admin'), medicineController.getQrCode);
router.get('/:id', authenticate, authorize('manufacturer', 'admin', 'retailer'), medicineController.getBatchById);
router.put('/:id', authenticate, authorize('manufacturer', 'admin'), medicineController.updateBatch);
router.post('/:id/recall', authenticate, authorize('manufacturer', 'admin'), medicineController.recallBatch);

// 3. Retailer / Admin endpoints
router.put('/:id/status', authenticate, authorize('retailer', 'admin'), retailerController.updateStatus);

module.exports = router;
