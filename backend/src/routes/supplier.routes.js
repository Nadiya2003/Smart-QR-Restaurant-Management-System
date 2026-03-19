import express from 'express';
import { 
    getSupplierDashboardStats, 
    getSuppliedItems, 
    getAdminRequests, 
    sendSupplyRequest, 
    getSupplyHistory, 
    markOrderDelivered,
    updateOrderStatus
} from '../controllers/supplier.controller.js';
import { authenticateUser } from '../middleware/unifiedAuth.js';
import { isStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

// All supplier routes are protected and staff-only
router.use(authenticateUser);
router.use(isStaff);

router.get('/stats', getSupplierDashboardStats);
router.get('/items', getSuppliedItems);
router.get('/admin-requests', getAdminRequests);
router.post('/supply-request', sendSupplyRequest);
router.get('/history', getSupplyHistory);
router.patch('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/delivered', markOrderDelivered);

export default router;
