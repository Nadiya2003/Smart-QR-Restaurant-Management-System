
import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All report routes require admin or authorized staff
router.use(protect);
router.use(adminOnly);

router.get('/food', reportController.getFoodReport);
router.get('/revenue', reportController.getRevenueReport);
router.get('/orders', reportController.getOrdersReport);
router.get('/cancellations', reportController.getCancellationsReport);
router.get('/customers', reportController.getCustomersReport);
router.get('/staff', reportController.getStaffReport);
router.get('/generate', reportController.generateUnifiedReport);
router.get('/pdf', reportController.generatePdfReport);

export default router;
