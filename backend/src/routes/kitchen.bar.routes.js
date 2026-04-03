import express from 'express';
import { 
    getKitchenOrders, 
    getBarOrders, 
    getInventory,
    checkIn, 
    checkOut, 
    getDutyStatus,
    getKitchenHistory,
    getBarHistory,
    updateKitchenOrderStatus
} from '../controllers/kitchen.bar.controller.js';
import { protect, isStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(isStaff);

// Duty Status
router.get('/duty/status', getDutyStatus);
router.post('/duty/check-in', checkIn);
router.post('/duty/check-out', checkOut);

// Orders
router.get('/kitchen/orders', getKitchenOrders);
router.get('/kitchen/history', getKitchenHistory);
router.put('/kitchen/orders/:id/status', updateKitchenOrderStatus);
router.get('/bar/orders', getBarOrders);
router.get('/bar/history', getBarHistory);

// Inventory
router.get('/inventory', getInventory);

export default router;

