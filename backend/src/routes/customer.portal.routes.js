
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
import { protect } from '../middleware/authMiddleware.js';
import { checkPermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/stats', checkPermission('account.manage'), getDashboardStats);
router.get('/account', checkPermission('account.manage'), getAccountData);
router.put('/profile', checkPermission('account.manage'), updateProfile);
router.post('/rate', checkPermission('stewards.rate'), submitRating);

router.get('/rewards', checkPermission('account.manage'), getRewards);
router.get('/my-rewards', checkPermission('account.manage'), getMyRewards);
router.post('/redeem', checkPermission('account.manage'), redeemReward);

export default router;
