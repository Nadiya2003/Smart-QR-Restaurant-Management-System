import express from 'express';
import { createDeliveryOrder, createTakeawayOrder, getCustomerOrders } from '../controllers/order.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/delivery', protect, createDeliveryOrder);
router.post('/takeaway', protect, createTakeawayOrder);
router.get('/customer', protect, getCustomerOrders);

export default router;
