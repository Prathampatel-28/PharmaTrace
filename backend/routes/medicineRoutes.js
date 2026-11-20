const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const retailerController = require('../controllers/retailerController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// 1. Public endpoints
router.get('/', medicineController.getAllMedicines);
router.get('/batch/:batchNumber', medicineController.getBatchByNumber);
router.get('/:id/qr', medicineController.getQrCode);
router.get('/:id', medicineController.getBatchById);

// 2. Manufacturer / Admin endpoints
router.post('/', authenticate, authorize('manufacturer', 'admin'), medicineController.createBatch);
router.get('/my/batches', authenticate, authorize('manufacturer', 'admin'), medicineController.getMyBatches);
router.put('/:id', authenticate, authorize('manufacturer', 'admin'), medicineController.updateBatch);
router.post('/:id/recall', authenticate, authorize('manufacturer', 'admin'), medicineController.recallBatch);

// 3. Retailer / Admin endpoints
router.put('/:id/status', authenticate, authorize('retailer', 'admin'), retailerController.updateStatus);

module.exports = router;
