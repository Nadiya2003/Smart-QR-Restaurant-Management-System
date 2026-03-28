
import express from 'express';
import { 
    getDashboardStats, 
    submitRating, 
    getAccountData, 
    updateProfile,
    getRewards,
    getMyRewards,
    redeemReward
} from '../controllers/customer.portal.controller.js';
import { protect, resolveUser } from '../middleware/authMiddleware.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.get('/stats', protect, checkPermission('account.manage'), getDashboardStats);
router.get('/account', protect, checkPermission('account.manage'), getAccountData);
router.put('/profile', protect, checkPermission('account.manage'), updateProfile);
router.post('/rate', resolveUser, submitRating);

router.get('/rewards', protect, checkPermission('account.manage'), getRewards);
router.get('/my-rewards', protect, checkPermission('account.manage'), getMyRewards);
router.post('/redeem', protect, checkPermission('account.manage'), redeemReward);

export default router;
