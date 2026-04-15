import express from 'express';
import { register, login, getProfile, updateProfile, changePassword, forgotPassword, resetPassword, verifyOTP } from '../controllers/unified.auth.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProfile } from '../utils/upload.js';

const router = express.Router();

router.post('/register', uploadProfile.single('profile_image'), register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, uploadProfile.single('profile_image'), updateProfile);
router.put('/change-password', protect, changePassword);

export default router;
