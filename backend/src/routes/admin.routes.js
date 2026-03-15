
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
    updateTableStatus
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
    getStaffActivity
} from '../controllers/admin.management.controller.js';


// Admin Middleware (Hardcoded check) -> we can reuse protect middleware but verify role='ADMIN'
// Assuming protect middleware sets req.user
import { protect, adminOnly, isStaff } from '../middleware/authMiddleware.js';
import { preventSelfModification, logAccess } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly); // Ensure only admins can access

router.get('/stats', getStats);
router.get('/revenue-analytics', getRevenueAnalytics);

// Staff
router.get('/staff', getAllStaff);

// Explicit Activation/Deactivation Endpoints
router.post('/staff/:id/activate',
    preventSelfModification,
    logAccess('STAFF_ACTIVATION'),
    (req, res, next) => { req.body.status = 'active'; next(); },
    toggleStaffStatus
);

router.post('/staff/:id/deactivate',
    preventSelfModification,
    logAccess('STAFF_DEACTIVATION'),
    (req, res, next) => { req.body.status = 'inactive'; next(); },
    toggleStaffStatus
);

router.put('/staff/:id/status', preventSelfModification, logAccess('STAFF_STATUS_CHANGE'), toggleStaffStatus);
router.put('/staff/:id/permissions', updateStaffPermissions);
router.put('/staff/:id/role', updateStaffRole);

// Customers
router.get('/customers', getAllCustomers);
router.put('/customers/:id/permissions', updateCustomerPermissions);
router.put('/customers/:id/status', toggleCustomerStatus);

// Orders
router.get('/orders', getAllOrders);
router.post('/orders', createOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/cancel/:type', cancelOrder);

// Reservations
router.get('/reservations', getAllReservations);
router.put('/reservations/:id/status', updateReservationStatus);

// Table & Area Management (Available to all Staff)
router.get('/areas', isStaff, getAllAreas);
router.post('/areas', isStaff, addArea);
router.put('/areas/:id', isStaff, updateArea);

router.get('/tables', isStaff, getAllTables);
router.post('/tables', isStaff, addTable);
router.put('/tables/:id', isStaff, updateTable);
router.put('/tables/:id/status', isStaff, updateTableStatus);

// Attendance
router.get('/attendance', getAttendance);

// Permissions
router.get('/permissions', getAllPermissions);
router.get('/roles/:roleId/permissions', getRolePermissions);
router.put('/roles/:roleId/permissions', updateRolePermissions);

// Inventory
router.get('/inventory', getInventory);
router.post('/inventory', addInventoryItem);
router.put('/inventory/:id', updateInventoryItem);
router.delete('/inventory/:id', deleteInventoryItem);
router.put('/inventory/:id/stock', updateStock);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);
router.put('/suppliers/:id/status', updateSupplierStatus);

// Reports
router.get('/reports', getReports);
router.post('/reports/seed', generateSampleReports);

// Notifications
router.get('/notifications', getNotifications);
router.post('/notifications', sendNotification);


// Staff Activity
router.get('/staff-activity', getStaffActivity);

// Audit Logs
router.get('/audit-logs', adminOnly, getAuditLogs);

export default router;
