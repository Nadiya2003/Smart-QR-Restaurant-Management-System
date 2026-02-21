import express from 'express';
import { createOrder, getCustomerOrders } from '../controllers/order.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public/Protected based on usage. 
// Frontend calls this passing token.
router.post('/', protect, createOrder);
router.get('/customer/:id', protect, getCustomerOrders);

export default router;
