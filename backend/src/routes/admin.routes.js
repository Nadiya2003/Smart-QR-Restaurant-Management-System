
import express from 'express';
import {
    getAllStaff,
    toggleStaffStatus,
    updateStaffPermissions,
    updateStaffRole,
    getAllCustomers,
    updateCustomerPermissions,
    toggleCustomerStatus,
    getAllOrders,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    getAllReservations,
    updateReservationStatus,
    getStats,
    getRevenueAnalytics,
    getAuditLogs,
    getAllAreas,
    addArea,
    updateArea,
    getAllTables,
    addTable,
    updateTable,
    updateTableStatus,
    getCancellationRequests,
    handleCancellationAction,
    getFeedbacks
} from '../controllers/admin.controller.js';
import {
    getAttendance,
    getAllPermissions,
    getRolePermissions,
    updateRolePermissions,
    getInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    updateStock,
    getSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    updateSupplierStatus,
    getReports,
    generateSampleReports,
    getNotifications,
    sendNotification,
    getStaffActivity,
    getStaffMembers,
    updateStaffStatus,
    updateStaffRole as updateStaffRoleManagement
} from '../controllers/admin.management.controller.js';


// Admin Middleware (Hardcoded check) -> we can reuse protect middleware but verify role='ADMIN'
// Assuming protect middleware sets req.user
import { protect, adminOnly, isStaff } from '../middleware/authMiddleware.js';
import { preventSelfModification, logAccess } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(protect);

// --- ADMIN ONLY SECTION (Metrics & System Management) ---
router.get('/stats', adminOnly, getStats);
router.get('/revenue-analytics', adminOnly, getRevenueAnalytics);
router.get('/audit-logs', adminOnly, getAuditLogs);
router.get('/notifications', adminOnly, getNotifications);
router.post('/notifications', adminOnly, sendNotification);

// Staff Management
router.get('/staff-members', adminOnly, logAccess('VIEW_STAFF'), getStaffMembers);
router.put('/staff/:id/status', adminOnly, preventSelfModification, logAccess('STAFF_STATUS_CHANGE'), updateStaffStatus);
router.put('/staff/:id/role', adminOnly, preventSelfModification, logAccess('STAFF_ROLE_CHANGE'), updateStaffRoleManagement);
router.get('/staff', adminOnly, getAllStaff);
router.put('/staff/:id/permissions', adminOnly, updateStaffPermissions);
router.get('/staff-activity', adminOnly, getStaffActivity);

// Customers
router.get('/customers', adminOnly, getAllCustomers);
router.put('/customers/:id/permissions', adminOnly, updateCustomerPermissions);
router.put('/customers/:id/status', adminOnly, toggleCustomerStatus);

// Reports
router.get('/reports', adminOnly, getReports);
router.post('/reports/seed', adminOnly, generateSampleReports);


// --- SHARED STAFF SECTION (Operations) ---
// Orders (Steward, Kitchen, Cashier need this)
router.get('/orders', isStaff, getAllOrders);
router.post('/orders', isStaff, createOrder);
router.put('/orders/:id/status', isStaff, updateOrderStatus);
router.post('/orders/:id/cancel/:type', isStaff, cancelOrder);
router.get('/orders/cancellation-requests', isStaff, getCancellationRequests);
router.post('/orders/cancellation-requests/:id/action', adminOnly, handleCancellationAction);

// Reservations
router.get('/reservations', isStaff, getAllReservations);
router.put('/reservations/:id/status', isStaff, updateReservationStatus);

// Table & Area Management
router.get('/areas', isStaff, getAllAreas);
router.post('/areas', isStaff, addArea);
router.put('/areas/:id', isStaff, updateArea);

router.get('/tables', isStaff, getAllTables);
router.post('/tables', isStaff, addTable);
router.put('/tables/:id', isStaff, updateTable);
router.put('/tables/:id/status', isStaff, updateTableStatus);

// Attendance
router.get('/attendance', isStaff, getAttendance);

// Inventory & Suppliers (Stock Managers need this)
router.get('/inventory', isStaff, getInventory);
router.post('/inventory', isStaff, addInventoryItem);
router.put('/inventory/:id', isStaff, updateInventoryItem);
router.delete('/inventory/:id', isStaff, deleteInventoryItem);
router.put('/inventory/:id/stock', isStaff, updateStock);

router.get('/suppliers', isStaff, getSuppliers);
router.post('/suppliers', isStaff, addSupplier);
router.put('/suppliers/:id', isStaff, updateSupplier);
router.delete('/suppliers/:id', isStaff, deleteSupplier);
router.put('/suppliers/:id/status', isStaff, updateSupplierStatus);

// Permissions
router.get('/permissions', adminOnly, getAllPermissions);
router.get('/roles/:roleId/permissions', adminOnly, getRolePermissions);
router.put('/roles/:roleId/permissions', adminOnly, updateRolePermissions);

// Feedback
router.get('/feedbacks', isStaff, getFeedbacks);

export default router;
