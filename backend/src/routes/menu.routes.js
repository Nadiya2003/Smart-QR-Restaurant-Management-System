import express from 'express';
import { getMenu, getMenuItemById, getCategories, createCategory, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menu.controller.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getMenu);
router.get('/categories/all', getCategories); // Specific path to avoid conflict with :id if needed, though :id is usually numeric
router.get('/:id', getMenuItemById);

// Protected Admin Routes
router.post('/categories', protect, adminOnly, createCategory);
router.post('/', protect, adminOnly, createMenuItem);
router.put('/:id', protect, adminOnly, updateMenuItem);
router.delete('/:id', protect, adminOnly, deleteMenuItem);


export default router;
