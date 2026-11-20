const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All admin routes require authentication and role === 'admin'
router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleAccountStatus);
router.delete('/users/:id', adminController.softDeleteUser);

router.get('/medicines', adminController.getMedicines);
router.delete('/medicines/:id', adminController.softDeleteMedicine);
router.patch('/medicines/:id/restore', adminController.restoreMedicine);

router.get('/audit-logs', adminController.getAuditLogs);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
