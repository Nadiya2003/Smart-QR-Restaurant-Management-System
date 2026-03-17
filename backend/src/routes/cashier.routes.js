import express from 'express';
import { 
    checkIn, 
    checkOut, 
    getAttendance, 
    createPosOrder, 
    getAllOrders, 
    createReservation, 
    getReservations, 
    createBooking, 
    getBookings,
    settleOrder,
    getOrderDetails,
    getPaymentMethods
} from '../controllers/cashier.controller.js';
import { getMenu } from '../controllers/menu.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Attendance
router.post('/attendance/checkin', protect, checkIn);
router.post('/attendance/checkout', protect, checkOut);
router.get('/attendance', protect, getAttendance);

// POS Orders
router.post('/orders', protect, createPosOrder);
router.get('/orders', protect, getAllOrders);
router.get('/orders/:id', protect, getOrderDetails);
router.post('/orders/:id/settle', protect, settleOrder);

// Payments
router.get('/payment-methods', protect, getPaymentMethods);

// Menu
router.get('/menu', protect, getMenu);

// Reservations
router.post('/reservations', protect, createReservation);
router.get('/reservations', protect, getReservations);

// Bookings
router.post('/bookings', protect, createBooking);
router.get('/bookings', protect, getBookings);

export default router;
