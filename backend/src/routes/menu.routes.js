import express from 'express';
import { getMenu, getMenuItemById, getCategories, createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability } from '../controllers/menu.controller.js';
import { protect, adminOnly, canToggleAvailability } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';

const menuStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/menu/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/categories/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadMenu = multer({ storage: menuStorage });
const uploadCategory = multer({ storage: categoryStorage });

const router = express.Router();

router.get('/', getMenu);
router.get('/categories/all', getCategories); 
router.get('/:id', getMenuItemById);

// Protected Management Routes
router.patch('/:id/availability', protect, canToggleAvailability, toggleAvailability);

// Protected Admin/Manager Routes
router.post('/categories', protect, adminOnly, uploadCategory.single('image'), createCategory);
router.put('/categories/:id', protect, adminOnly, uploadCategory.single('image'), updateCategory);
router.delete('/categories/:id', protect, adminOnly, deleteCategory);

router.post('/', protect, adminOnly, uploadMenu.single('image'), createMenuItem);
router.put('/:id', protect, adminOnly, uploadMenu.single('image'), updateMenuItem);
router.delete('/:id', protect, adminOnly, deleteMenuItem);

export default router;
