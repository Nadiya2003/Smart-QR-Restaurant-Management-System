import pool from '../config/db.js';

/**
 * Internal helper to create low stock alerts for Admins and Inventory Managers
 */
const checkAndNotifyStock = async (connection, inventoryId) => {
    try {
        // 1. Get current stock and info
        const [items] = await connection.query(
            'SELECT item_name, quantity, min_level FROM inventory WHERE id = ?',
            [inventoryId]
        );
        
        if (items.length === 0) return;
        const { item_name, quantity, min_level } = items[0];

        if (quantity <= min_level) {
            const title = quantity <= 0 ? 'OUT OF STOCK 🚨' : 'LOW STOCK ALERT ⚠️';
            const message = quantity <= 0 
                ? `Critical: "${item_name}" is completely out of stock.` 
                : `Warning: "${item_name}" is low (${quantity} left). Minimum level is ${min_level}.`;
            const type = quantity <= 0 ? 'CRITICAL' : 'WARNING';

            // 2. Get role IDs for Admin and Inventory Manager
            const [roles] = await connection.query(
                'SELECT id FROM staff_roles WHERE role_name IN ("admin", "manager", "inventory_manager")'
            );

            // 3. Create notifications for each role
            for (const role of roles) {
                // Check if a similar unread notification already exists to avoid spam
                const [existing] = await connection.query(
                    'SELECT id FROM staff_notifications WHERE role_id = ? AND title = ? AND is_read = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
                    [role.id, title]
                );

                if (existing.length === 0) {
                    await connection.query(
                        'INSERT INTO staff_notifications (role_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
                        [role.id, title, message, type]
                    );
                }
            }
        }
    } catch (error) {
        console.error('Notification logic error:', error);
    }
};

/**
 * GET /api/inventory
 * Fetch all inventory items with search and filtering
 */
export const getInventory = async (req, res) => {
    try {
        const { search, category, status } = req.query;
        let query = `
            SELECT i.*, s.name as supplier_name 
            FROM inventory i 
            LEFT JOIN suppliers s ON i.supplier_id = s.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND i.item_name LIKE ?`;
            params.push(`%${search}%`);
        }
        if (category && category !== 'All') {
            query += ` AND i.category = ?`;
            params.push(category);
        }
        if (status && status !== 'All') {
            query += ` AND i.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY i.item_name ASC`;

        const [rows] = await pool.query(query, params);
        res.json({ inventory: rows });
    } catch (error) {
        console.error('Fetch inventory error:', error);
        res.status(500).json({ message: 'Failed to fetch inventory' });
    }
};

/**
 * POST /api/inventory/adjust
 * Manual stock adjustment (Add/Reduce)
 */
export const adjustStock = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { inventory_id, action_type, quantity, reason } = req.body;
        const performed_by = req.user.userId;

        await connection.beginTransaction();

        // 1. Update Inventory Table
        let updateQuery = '';
        if (action_type === 'ADD') {
            updateQuery = 'UPDATE inventory SET quantity = quantity + ? WHERE id = ?';
        } else if (action_type === 'REDUCE' || action_type === 'ADJUST') {
            updateQuery = 'UPDATE inventory SET quantity = ? WHERE id = ?';
        }
        
        // Note: For REDUCE specifically in local logic, we might want quantity = quantity - ?
        // But let's assume quantity passed is the NEW volume or the delta based on action_type.
        // Rule: If REDUCE, subtract. If ADJUST, set.
        if (action_type === 'REDUCE') {
            updateQuery = 'UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE id = ?';
        }

        await connection.query(updateQuery, [quantity, inventory_id]);

        // 2. Refresh Status and updated_at
        await connection.query(`
            UPDATE inventory 
            SET status = CASE 
                WHEN quantity = 0 THEN 'Out of Stock'
                WHEN quantity <= min_level THEN 'Low Stock'
                ELSE 'Available'
            END,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [inventory_id]);

        // 3. Log History
        await connection.query(`
            INSERT INTO stock_history (inventory_id, action_type, quantity, reason, performed_by)
            VALUES (?, ?, ?, ?, ?)
        `, [inventory_id, action_type, quantity, reason, performed_by]);

        // 4. Trigger Alerts if needed
        await checkAndNotifyStock(connection, inventory_id);

        await connection.commit();
        res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Adjust stock error:', error);
        res.status(500).json({ message: 'Failed to adjust stock' });
    } finally {
        connection.release();
    }
};

/**
 * POST /api/inventory/restock-request
 */
export const createRestockRequest = async (req, res) => {
    try {
        const { inventory_id, supplier_id, quantity } = req.body;
        const requested_by = req.user.userId;

        await pool.query(`
            INSERT INTO restock_requests (inventory_id, supplier_id, quantity, requested_by, status)
            VALUES (?, ?, ?, ?, 'PENDING')
        `, [inventory_id, supplier_id, quantity, requested_by]);

        res.status(201).json({ success: true, message: 'Restock request sent to Admin' });
    } catch (error) {
        console.error('Create restock request error:', error);
        res.status(500).json({ message: 'Failed to create request' });
    }
};

/**
 * GET /api/inventory/restock-requests
 */
export const getRestockRequests = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT rr.*, i.item_name, i.unit, s.name as supplier_name,
                   su.full_name as requester_name
            FROM restock_requests rr
            JOIN inventory i ON rr.inventory_id = i.id
            JOIN suppliers s ON rr.supplier_id = s.id
            LEFT JOIN staff_users su ON rr.requested_by = su.id
            ORDER BY rr.created_at DESC
        `);
        res.json({ requests: rows });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

/**
 * PUT /api/inventory/restock-requests/:id/status
 */
export const updateRestockStatus = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { status } = req.body;
        const admin_id = req.user.userId;

        await connection.beginTransaction();

        // 1. Update status
        await connection.query(
            'UPDATE restock_requests SET status = ?, approved_by = ? WHERE id = ?',
            [status, admin_id, id]
        );

        // 2. If COMPLETED, auto-update inventory
        if (status === 'COMPLETED') {
            const [request] = await connection.query('SELECT inventory_id, quantity FROM restock_requests WHERE id = ?', [id]);
            if (request.length > 0) {
                const { inventory_id, quantity } = request[0];
                
                // Add to inventory
                await connection.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [quantity, inventory_id]);
                
                // Update status logic
                await connection.query(`
                    UPDATE inventory 
                    SET status = CASE 
                        WHEN quantity = 0 THEN 'Out of Stock'
                        WHEN quantity <= min_level THEN 'Low Stock'
                        ELSE 'Available'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [inventory_id]);

                // Log History
                await connection.query(`
                    INSERT INTO stock_history (inventory_id, action_type, quantity, reason, performed_by)
                    VALUES (?, 'RESTOCK', ?, 'Automatic update from completed restock request', ?)
                `, [inventory_id, quantity, admin_id]);

                // Trigger Alerts if needed (though restock usually fixes low stock)
                await checkAndNotifyStock(connection, inventory_id);
            }
        }

        await connection.commit();
        res.json({ success: true, message: `Request status updated to ${status}` });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update restock status error:', error);
        res.status(500).json({ message: 'Failed to update status' });
    } finally {
        connection.release();
    }
};

/**
 * GET /api/inventory/suppliers
 */
export const getSuppliers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM suppliers WHERE status = "active"');
        res.json({ suppliers: rows });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch suppliers' });
    }
};

/**
 * GET /api/inventory/history
 */
export const getStockHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT sh.*, i.item_name, su.full_name as staff_name
            FROM stock_history sh
            JOIN inventory i ON sh.inventory_id = i.id
            LEFT JOIN staff_users su ON sh.performed_by = su.id
            ORDER BY sh.created_at DESC
            LIMIT 100
        `);
        res.json({ history: rows });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch history' });
    }
};

/**
 * GET /api/inventory/report
 * Basic analytics for inventory
 */
export const getInventoryReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Total items per status
        const [statusStats] = await pool.query(`
            SELECT status, COUNT(*) as count FROM inventory GROUP BY status
        `);

        // Recent consumption/adds from stock history
        const [historyStats] = await pool.query(`
            SELECT action_type, SUM(quantity) as total_qty, COUNT(*) as transaction_count
            FROM stock_history
            WHERE created_at BETWEEN ? AND ?
            GROUP BY action_type
        `, [startDate, endDate]);

        // Item Usage from Orders (for linked menu items)
        const [usageStats] = await pool.query(`
            SELECT i.item_name, SUM(oi.quantity) as used_quantity
            FROM order_items oi
            JOIN inventory i ON oi.menu_item_id = i.menu_item_id
            WHERE oi.created_at BETWEEN ? AND ?
            GROUP BY i.id
            ORDER BY used_quantity DESC
            LIMIT 10
        `, [startDate, endDate]);

        res.json({ statusStats, historyStats, usageStats });
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ message: 'Failed to generate report' });
    }
};

/**
 * POST /api/inventory
 * Create new inventory item
 */
export const createInventoryItem = async (req, res) => {
    try {
        const { item_name, category, unit, quantity, min_level, supplier_id } = req.body;
        
        // Check if item already exists
        const [existing] = await pool.query('SELECT id FROM inventory WHERE item_name = ?', [item_name]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'An item with this name already exists' });
        }

        const status = quantity === 0 ? 'Out of Stock' : (quantity <= min_level ? 'Low Stock' : 'Available');

        const [result] = await pool.query(`
            INSERT INTO inventory (item_name, category, unit, quantity, min_level, supplier_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [item_name, category || 'General', unit || 'units', quantity || 0, min_level || 5, supplier_id || null, status]);

        res.status(201).json({ success: true, message: 'Item created successfully', id: result.insertId });
    } catch (error) {
        console.error('Create inventory item error:', error);
        res.status(500).json({ message: 'Failed to create item' });
    }
};

/**
 * PUT /api/inventory/:id
 * Update existing inventory item
 */
export const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, category, unit, quantity, min_level, supplier_id } = req.body;

        const status = quantity === 0 ? 'Out of Stock' : (quantity <= min_level ? 'Low Stock' : 'Available');

        await pool.query(`
            UPDATE inventory 
            SET item_name = ?, category = ?, unit = ?, quantity = ?, min_level = ?, supplier_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [item_name, category, unit, quantity, min_level, supplier_id, status, id]);

        res.json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
        console.error('Update inventory item error:', error);
        res.status(500).json({ message: 'Failed to update item' });
    }
};

/**
 * DELETE /api/inventory/:id
 * Delete inventory item
 */
export const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Delete inventory item error:', error);
        res.status(500).json({ message: 'Failed to delete item' });
    }
};
