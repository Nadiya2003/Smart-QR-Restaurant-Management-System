import express from 'express';
import { getAllStewards, getStewardById } from '../controllers/steward.controller.js';

const router = express.Router();

router.get('/', getAllStewards);
router.get('/:id', getStewardById);

export default router;
