import express from 'express';
import {
    getDashboardStats,
    getStaffActivities,
    getAllStaff
} from '../controllers/staff.dashboard.controller.js';
import { authenticateStaff, managerOnly } from '../middleware/staffAuth.js';

const router = express.Router();

router.get('/stats', authenticateStaff, getDashboardStats);
router.get('/activities', authenticateStaff, getStaffActivities);
router.get('/staff', authenticateStaff, managerOnly, getAllStaff);

export default router;
