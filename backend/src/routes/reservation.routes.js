import express from 'express';
import { createReservation, getReservations, cancelReservation } from '../controllers/reservation.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createReservation); // Only logged in users can reserve
router.get('/all', protect, getReservations); // Admin dashboard usage
router.put('/cancel/:id', protect, cancelReservation);

export default router;

