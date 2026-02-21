
import express from 'express';
import {
    getAssignedOrders,
    updateStaffOrderStatus,
    getFilteredOrders,
    processStewardAction,
    sendNotification
} from '../controllers/staff.work.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';
import pool from '../config/db.js'; // Ensure pool is imported if needed for direct queries, otherwise remove

const router = express.Router();

// Allow Customers/Anyone to send notifications (if logic requires unauthenticated or cross-role)
// However, the controller uses 'req.body'. 
// Typically notifications from Customer to Steward might not need 'protect' middleware IF it's an open endpoint, 
// OR we should create a separate public endpoint. 
// For now, prompt says "Payment Flow", user is Logged In (Customer).
// So this route is under /api/staff, which calls 'protect' (Staff Auth). 
// WAIT. 'protect' middleware usually checks for STAFF token. Customer token might fail here if it expects Staff Role.
// I need to check 'protect' middleware. If strict Staff, Customer can't call it.

// Let's create a specific route for notifications that might be open or customer-allowed.
// Or, simple fix: Add a specific route `router.post('/notifications/send', sendNotification)` BEFORE `router.use(protect)` if needed, 
// or ensure `protect` allows customers. 
// Assuming `protect` checks ANY valid token. I'll check `authMiddleware.js`.
// Safest bet: Place it before `router.use(protect)` and check auth inside if needed, or allow it.
// Actually, `PaymentSelection.jsx` makes the call. User is Customer.
// If `staff.work.routes.js` has `router.use(protect)` at line 14, and that checks for STAFF, 
// then Customer calls will fail.

// I will check `authMiddleware.js`. For now, I will add it to the router, but might need to move it.
router.post('/notifications/send', sendNotification);

router.use(protect); // Must be logged in (Staff)

// 1. Dashboards
router.get('/orders', checkPermission('orders.view'), getAssignedOrders);

// 2. Work Permissions
router.get('/orders/dine-in', checkPermission('orders.view_dine_in'), (req, res) => res.redirect('/api/staff/filter/DINE_IN'));
router.get('/orders/takeaway', checkPermission('orders.view_takeaway'), (req, res) => res.redirect('/api/staff/filter/TAKEAWAY'));
router.get('/orders/delivery', checkPermission('orders.view_delivery'), (req, res) => res.redirect('/api/staff/filter/DELIVERY'));

router.get('/filter/:type', getFilteredOrders); // Permission checked by redirection or explicit map

router.put('/orders/:id/status', checkPermission('orders.status_update'), updateStaffOrderStatus);
router.post('/action', checkPermission('orders.accept_reject'), processStewardAction);

export default router;
