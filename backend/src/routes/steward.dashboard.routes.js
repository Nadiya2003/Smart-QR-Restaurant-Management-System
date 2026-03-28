import express from 'express';
import { 
    getTableStatus, 
    getStewardOrders, 
    addOrderItem, 
    requestOrderCancel, 
    getStewardHistory,
    getMyNotifications,
    checkIn,
    checkOut,
    getDutyStatus,
    getUpcomingReservations,
    getMyStats
} from '../controllers/steward.dashboard.controller.js';
import { protect, isStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(isStaff);

// Steward Stats & Performance
router.get('/my-stats', getMyStats);

// Tables
router.get('/tables', getTableStatus);
router.get('/reservations', getUpcomingReservations);

// Duty Status
// Duty Status
router.get('/duty/status', getDutyStatus);
router.post('/duty/check-in', checkIn);
router.post('/duty/check-out', checkOut);

// Orders
router.get('/orders/steward/:stewardId', getStewardOrders);
router.post('/orders/:id/add-item', addOrderItem);
router.post('/orders/:id/cancel-request', requestOrderCancel);
router.get('/orders/history/:stewardId', getStewardHistory);

// Notifications
router.get('/notifications', getMyNotifications);

export default router;
