import express from 'express';
import { 
    createDeliveryOrder, 
    createTakeawayOrder, 
    createDineInOrder,
    getCustomerOrders,
    getActiveOrderByTable,
    cancelDeliveryOrder,
    cancelTakeawayOrder,
    requestDineInCancellation,
    removeOrderItem,
    getAllTables,
    updateOrderTable
} from '../controllers/order.controller.js';
import { protect, resolveUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/delivery', protect, createDeliveryOrder);
router.post('/takeaway', protect, createTakeawayOrder);
router.post('/dine-in', resolveUser, createDineInOrder);
router.get('/customer', protect, getCustomerOrders);
router.get('/active-table/:tableNumber', getActiveOrderByTable);
router.put('/delivery/cancel/:id', protect, cancelDeliveryOrder);
router.put('/takeaway/cancel/:id', protect, cancelTakeawayOrder);
router.post('/dine-in/cancel-request/:id', protect, requestDineInCancellation);
router.delete('/:orderId/items/:itemId', resolveUser, removeOrderItem);
router.get('/tables', getAllTables);
router.post('/update-table', resolveUser, updateOrderTable);

export default router;
