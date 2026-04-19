import express from 'express';
import { registerStaff, loginStaff, getAllRoles, getColleagues, getStaffProfile, logoutStaff, updateStaffProfile, verifyStaffEmail } from '../controllers/staff.auth.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadProfile } from '../utils/upload.js';

const router = express.Router();

// Public routes
router.post('/register', uploadProfile.single('profile_image'), registerStaff);
router.post('/login', loginStaff);
router.post('/verify-email', verifyStaffEmail);
router.get('/roles', getAllRoles);  // Public - needed for registration dropdown

// Protected routes
router.post('/logout', protect, logoutStaff);
router.get('/profile', protect, getStaffProfile);
router.put('/profile', protect, uploadProfile.single('profile_image'), updateStaffProfile);
router.get('/auth/team', protect, getColleagues);

export default router;
