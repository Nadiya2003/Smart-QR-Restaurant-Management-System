import express from 'express';
import { 
    getInventory, 
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustStock, 
    createRestockRequest, 
    getRestockRequests, 
    updateRestockStatus, 
    getSuppliers, 
    getStockHistory, 
    getInventoryReport,
    getSupplierOrders
} from '../controllers/inventory.controller.js';
import { protect, isStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(isStaff);

// Inventory CRUD & Adjust
router.get('/', getInventory);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);
router.post('/adjust', adjustStock);

// Suppliers
router.get('/suppliers', getSuppliers);

// Restock Flow
router.post('/restock-request', createRestockRequest);
router.get('/restock-requests', getRestockRequests);
router.put('/restock-requests/:id/status', updateRestockStatus);

// History & Reports
router.get('/history', getStockHistory);
router.get('/report', getInventoryReport);
router.get('/supplier-orders', getSupplierOrders);

export default router;
