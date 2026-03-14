import express from 'express';
import { getMenu, getMenuItemById, getCategories, createCategory, createMenuItem, updateMenuItem, deleteMenuItem } from '../controllers/menu.controller.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/menu/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

const router = express.Router();

router.get('/', getMenu);
router.get('/categories/all', getCategories); 
router.get('/:id', getMenuItemById);

// Protected Admin Routes
router.post('/categories', protect, adminOnly, createCategory);
router.post('/', protect, adminOnly, upload.single('image'), createMenuItem);
router.put('/:id', protect, adminOnly, upload.single('image'), updateMenuItem);
router.delete('/:id', protect, adminOnly, deleteMenuItem);


export default router;
