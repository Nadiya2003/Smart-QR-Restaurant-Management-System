import express from 'express';
import multer from 'multer';
import path from 'path';
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
    requestItemRemoval,
    getRemovalRequests,
    approveRemovalRequest,
    rejectRemovalRequest,
    getAllTables,
    updateOrderTable,
    endDineInSession,
    syncGuestOrder,
    requestPayment,
    closeOrder
} from '../controllers/order.controller.js';
import { getUnifiedTables } from '../controllers/table.controller.js';
import { protect, resolveUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, `slip-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

router.post('/delivery', protect, createDeliveryOrder);
router.post('/takeaway', protect, createTakeawayOrder);
router.post('/dine-in', resolveUser, createDineInOrder);
router.get('/customer', protect, getCustomerOrders);
router.get('/active-table/:tableNumber', getActiveOrderByTable);
router.put('/delivery/cancel/:id', protect, cancelDeliveryOrder);
router.put('/takeaway/cancel/:id', protect, cancelTakeawayOrder);
router.post('/dine-in/cancel-request/:id', resolveUser, requestDineInCancellation);
router.delete('/:orderId/items/:itemId', resolveUser, removeOrderItem);
router.post('/:orderId/items/:itemId/removal-request', resolveUser, requestItemRemoval);
router.get('/removal-requests', protect, getRemovalRequests);
router.put('/removal-requests/:requestId/approve', protect, approveRemovalRequest);
router.put('/removal-requests/:requestId/reject', protect, rejectRemovalRequest);
router.get('/tables', getUnifiedTables);
router.post('/update-table', resolveUser, updateOrderTable);
router.post('/dine-in/end-session', resolveUser, endDineInSession);
router.post('/sync-guest', protect, syncGuestOrder);
router.post('/request-payment', resolveUser, upload.single('slip'), requestPayment);
router.put('/:orderId/close', protect, closeOrder);

export default router;
