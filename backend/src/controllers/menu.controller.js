import pool from '../config/db.js';

export const getMenu = async (req, res) => {
    try {
        const [items] = await pool.query(`
            SELECT m.*, c.name as category 
            FROM menu_items m 
            JOIN categories c ON m.category_id = c.id 
            ORDER BY c.name, m.name
        `);
        res.json(items);

    } catch (error) {
        console.error('Get menu error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getMenuItemById = async (req, res) => {
    const { id } = req.params;
    try {
        const [items] = await pool.query(`
            SELECT m.*, c.name as category 
            FROM menu_items m 
            JOIN categories c ON m.category_id = c.id 
            WHERE m.id = ?
        `, [id]);
        if (items.length === 0) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(items[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories');
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const createCategory = async (req, res) => {
    const { name, description, image } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
            [name, description, image]
        );
        res.status(201).json({ id: result.insertId, name, description, image });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const createMenuItem = async (req, res) => {
    const { category_id, name, description, price, tags } = req.body;
    const image = req.file ? `/uploads/menu/${req.file.filename}` : req.body.image;
    try {
        const tagsJson = tags ? JSON.stringify(tags) : null;
        const [result] = await pool.query(
            'INSERT INTO menu_items (category_id, name, description, price, image, tags, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
            [category_id, name, description, price, image, tagsJson]
        );
        res.status(201).json({ id: result.insertId, category_id, name, description, price, image, tags, is_active: true });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateMenuItem = async (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, tags, is_active } = req.body;
    const image = req.file ? `/uploads/menu/${req.file.filename}` : req.body.image;
    try {
        const tagsJson = tags ? JSON.stringify(tags) : null;
        await pool.query(
            'UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, image = ?, tags = ?, is_active = ? WHERE id = ?',
            [category_id, name, description, price, image, tagsJson, is_active, id]
        );
        res.json({ message: 'Menu item updated successfully' });
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteMenuItem = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM menu_items WHERE id = ?', [id]);
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

