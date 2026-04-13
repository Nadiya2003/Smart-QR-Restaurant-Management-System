import express from 'express';
import { 
    createReservation, 
    getReservations, 
    cancelReservation,
    getDiningAreas,
    getTablesWithAvailability,
    updateReservationStatus
} from '../controllers/reservation.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/areas', getDiningAreas); // Publicly viewable
router.get('/availability', getTablesWithAvailability); // Publicly viewable
router.post('/', protect, createReservation); // Only logged in users can reserve
router.get('/all', protect, getReservations); // Admin dashboard usage
router.put('/cancel/:id', protect, cancelReservation);
router.put('/:id/status', protect, updateReservationStatus);

export default router;

