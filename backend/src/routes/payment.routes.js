import express from 'express';
import { processPayment, getPaymentHistory } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/process', processPayment);
router.get('/history/:customerId', getPaymentHistory);

export default router;
