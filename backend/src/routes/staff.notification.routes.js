import express from 'express';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    sendNotification
} from '../controllers/staff.notification.controller.js';
import { authenticateStaff } from '../middleware/staffAuth.js';

const router = express.Router();

router.get('/', authenticateStaff, getNotifications);
router.put('/:notificationId/read', authenticateStaff, markAsRead);
router.put('/read-all', authenticateStaff, markAllAsRead);
router.post('/send', sendNotification); // Public endpoint for customer notifications

export default router;
