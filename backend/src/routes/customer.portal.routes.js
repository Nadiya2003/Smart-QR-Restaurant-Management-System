
import express from 'express';
import { getDashboardStats, submitRating, getAccountData } from '../controllers/customer.portal.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/stats', checkPermission('account.manage'), getDashboardStats);
router.get('/account', checkPermission('account.manage'), getAccountData);
router.post('/rate', checkPermission('stewards.rate'), submitRating);

export default router;
