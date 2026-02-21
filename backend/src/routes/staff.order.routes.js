import express from 'express';
import {
    getOrders,
    updateOrderStatus,
    getOrderDetails
} from '../controllers/staff.order.controller.js';
import { authenticateStaff } from '../middleware/staffAuth.js';

const router = express.Router();

router.get('/', authenticateStaff, getOrders);
router.get('/:orderId', authenticateStaff, getOrderDetails);
router.put('/:orderId/status', authenticateStaff, updateOrderStatus);

export default router;
