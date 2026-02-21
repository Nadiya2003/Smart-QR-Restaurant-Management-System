import express from 'express';
import { createReservation, getMyReservations } from '../controllers/reservation.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createReservation);
router.get('/my', protect, getMyReservations);

export default router;
