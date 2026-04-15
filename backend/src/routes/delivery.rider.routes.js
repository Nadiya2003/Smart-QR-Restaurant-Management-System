import express from 'express';
import { authenticateUser } from '../middleware/unifiedAuth.js';
import { 
    getSummary, getOrders, createOrder, 
    updateOrderStatus, updatePaymentStatus, requestCancel, getHistory,
    checkIn, checkOut, getDutyStatus, getNotifications, updateOrderItems,
    closeOrder
} from '../controllers/delivery.rider.controller.js';

const router = express.Router();

// Attendance (Duty)
router.post('/duty/check-in', authenticateUser, checkIn);
router.post('/duty/check-out', authenticateUser, checkOut);
router.get('/duty/status', authenticateUser, getDutyStatus);

// Summary / Dashboard
router.get('/summary', authenticateUser, getSummary);
router.get('/notifications', authenticateUser, getNotifications);

// Orders
router.get('/orders', authenticateUser, getOrders);
router.post('/orders', authenticateUser, createOrder);
router.patch('/orders/:id/status', authenticateUser, updateOrderStatus);
router.patch('/orders/:id/payment-status', authenticateUser, updatePaymentStatus);
router.patch('/orders/:id/items', authenticateUser, updateOrderItems);
router.patch('/orders/:id/close', authenticateUser, closeOrder);
router.post('/orders/:id/cancel-request', authenticateUser, requestCancel);

// History
router.get('/history', authenticateUser, getHistory);

export default router;
