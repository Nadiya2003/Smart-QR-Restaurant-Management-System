import pool from '../config/db.js';

export const getMenu = async (req, res) => {
    try {
        const [items] = await pool.query(`
            SELECT m.*, c.name as category 
            FROM menu_items m 
            JOIN categories c ON m.category_id = c.id 
            WHERE m.is_active = TRUE
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
    const { category_id, name, description, price, image } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO menu_items (category_id, name, description, price, image, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
            [category_id, name, description, price, image]
        );
        res.status(201).json({ id: result.insertId, category_id, name, description, price, image, is_active: true });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
