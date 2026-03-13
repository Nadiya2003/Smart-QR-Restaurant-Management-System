import express from 'express';
import { createReservation, getReservations } from '../controllers/reservation.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createReservation); // Publicly accessible to book? Or protect?
router.get('/all', protect, getReservations); // Admin dashboard usage

export default router;
