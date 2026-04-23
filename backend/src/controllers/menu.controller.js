import pool from '../config/db.js';

export const getMenu = async (req, res) => {
    const { type, available_only, has_image, limit_per_category, admin } = req.query;
    
    try {
        let query = `
            WITH RankedItems AS (
                SELECT m.*, c.name as category,
                ROW_NUMBER() OVER(PARTITION BY m.category_id ORDER BY m.name) as row_num
                FROM menu_items m
                JOIN categories c ON m.category_id = c.id
                WHERE 1=1
        `;
        
        // Only filter by image for public-facing pages (not admin)
        if (!admin) {
            query += " AND (m.image IS NOT NULL AND m.image != '' AND m.image != '/uploads/menu/default.png') ";
        }
        
        const params = [];

        if (type) {
            query += " AND m.item_type = ? ";
            params.push(type);
        }

        if (available_only === 'true') {
            query += " AND m.is_available = 1 ";
        }

        query += ` ) SELECT * FROM RankedItems `;

        if (limit_per_category) {
            query += " WHERE row_num <= ? ";
            params.push(parseInt(limit_per_category));
        }

        query += " ORDER BY category, name ";

        const [rows] = await pool.query(query, params);

        const host = req.get('host') || '172.19.8.23:5000';
        const protocol = req.protocol === 'https' ? 'https' : 'http';
        const baseUrl = `${protocol}://${host}`;

        const items = rows.map(item => ({
            ...item,
            image: item.image 
                ? (item.image.startsWith('http') ? item.image : `${baseUrl}${item.image}`)
                : null
        }));
        
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
        const [rows] = await pool.query('SELECT * FROM categories');
        
        const host = req.get('host') || '172.19.8.23:5000';
        const protocol = req.protocol === 'https' ? 'https' : 'http';
        const baseUrl = `${protocol}://${host}`;

        const categories = rows.map(cat => ({
            ...cat,
            image: cat.image 
                ? (cat.image.startsWith('http') ? cat.image : `${baseUrl}${cat.image}`) 
                : `${baseUrl}/uploads/categories/default.png`
        }));
        
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const createCategory = async (req, res) => {
    const { name, description } = req.body;
    const image = req.file ? `/uploads/categories/${req.file.filename}` : req.body.image;
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

export const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const image = req.file ? `/uploads/categories/${req.file.filename}` : req.body.image;
    try {
        await pool.query(
            'UPDATE categories SET name = ?, description = ?, image = ? WHERE id = ?',
            [name, description, image, id]
        );
        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deletion if items exist? No, user didn't specify. I'll just delete.
        await pool.query('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const createMenuItem = async (req, res) => {
    const { category_id, name, description, price, tags, buying_price, item_type } = req.body;
    const image = req.file ? `/uploads/menu/${req.file.filename}` : req.body.image;

    if (!image) {
        return res.status(400).json({ message: 'Image upload is mandatory for menu items.' });
    }

    try {
        const tagsJson = tags ? JSON.stringify(tags) : null;
        const assignedBuyingPrice = buying_price || 0;
        const [result] = await pool.query(
            'INSERT INTO menu_items (category_id, name, description, price, buying_price, image, tags, item_type, is_active, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)',
            [category_id, name, description, price, assignedBuyingPrice, image, tagsJson, item_type || 'Food']
        );
        // Notify via Socket.io for Real-time Sync
        if (global.io) {
            global.io.emit('menuChange', { action: 'create', itemId: result.insertId });
        }

        res.status(201).json({ id: result.insertId, category_id, name, description, price, image, tags, is_active: true });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateMenuItem = async (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, tags, is_active, buying_price, item_type, is_available } = req.body;
    const image = req.file ? `/uploads/menu/${req.file.filename}` : req.body.image;
    try {
        const tagsJson = tags ? JSON.stringify(tags) : null;
        const assignedBuyingPrice = buying_price || 0;
        await pool.query(
            'UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, buying_price = ?, image = ?, tags = ?, is_active = ?, item_type = ?, is_available = ? WHERE id = ?',
            [category_id, name, description, price, assignedBuyingPrice, image, tagsJson, is_active, item_type, is_available, id]
        );
        // Notify via Socket.io for Real-time Sync
        if (global.io) {
            global.io.emit('menuChange', { action: 'update', itemId: id });
        }

        res.json({ message: 'Menu item updated successfully' });
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const toggleAvailability = async (req, res) => {
    const { id } = req.params;
    const { is_available } = req.body;
    try {
        await pool.query('UPDATE menu_items SET is_available = ? WHERE id = ?', [is_available ? 1 : 0, id]);
        
        // Notify via Socket.io for Real-time Sync
        if (global.io) {
            global.io.emit('menuUpdate', { itemId: id, isAvailable: !!is_available });
        }
        
        res.json({ success: true, message: `Item marked as ${is_available ? 'Available' : 'Not Available'}` });
    } catch (error) {
        console.error('Toggle availability error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteMenuItem = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM menu_items WHERE id = ?', [id]);
        // Notify via Socket.io for Real-time Sync
        if (global.io) {
            global.io.emit('menuChange', { action: 'delete', itemId: id });
        }
        
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

