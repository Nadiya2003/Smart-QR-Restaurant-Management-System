import express from 'express';
const router = express.Router();
import { submitContactMessage } from '../controllers/contact.controller.js';

router.post('/', submitContactMessage);

export default router;
