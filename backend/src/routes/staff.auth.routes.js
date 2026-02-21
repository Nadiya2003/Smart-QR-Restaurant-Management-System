import express from 'express';
import { registerStaff, loginStaff, getAllRoles, getColleagues, getStaffProfile } from '../controllers/staff.auth.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerStaff);
router.post('/login', loginStaff);
router.get('/roles', getAllRoles);  // Public - needed for registration dropdown

// Protected routes
router.get('/profile', protect, getStaffProfile);
router.get('/auth/team', protect, getColleagues);

export default router;
