import express from 'express';
import { 
    createDeliveryOrder, 
    createTakeawayOrder, 
    createDineInOrder,
    getCustomerOrders,
    cancelDeliveryOrder,
    cancelTakeawayOrder 
} from '../controllers/order.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/delivery', protect, createDeliveryOrder);
router.post('/takeaway', protect, createTakeawayOrder);
router.post('/dine-in', protect, createDineInOrder);
router.get('/customer', protect, getCustomerOrders);
router.put('/delivery/cancel/:id', protect, cancelDeliveryOrder);
router.put('/takeaway/cancel/:id', protect, cancelTakeawayOrder);

export default router;

