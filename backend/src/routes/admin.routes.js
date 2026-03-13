
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
    updateOrderStatus,
    getAllReservations,
    updateReservationStatus,
    getStats,
    getAuditLogs
} from '../controllers/admin.controller.js';
// Admin Middleware (Hardcoded check) -> we can reuse protect middleware but verify role='ADMIN'
// Assuming protect middleware sets req.user
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { preventSelfModification, logAccess } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly); // Ensure only admins can access

router.get('/stats', getStats);

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
router.put('/orders/:id/status', updateOrderStatus);

// Reservations
router.get('/reservations', getAllReservations);
router.put('/reservations/:id/status', updateReservationStatus);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
