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

            // 3. Create notifications for each restaurant staff role
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

            // 4. Notify Suppliers assigned to this item
            const [itemInfo] = await connection.query('SELECT supplier_id FROM inventory WHERE id = ?', [inventoryId]);
            if (itemInfo.length > 0 && itemInfo[0].supplier_id) {
                const supplierId = itemInfo[0].supplier_id;
                // Find all staff members for this supplier
                const [supplierStaff] = await connection.query(
                    'SELECT staff_id FROM supplier_staff WHERE supplier_id = ?',
                    [supplierId]
                );

                for (const staff of supplierStaff) {
                    const supplierTitle = `URGENT: Stock Low for ${item_name}`;
                    const supplierMessage = `Hello, the stock for "${item_name}" at Melissa's Food Court has reached ${quantity} ${items[0].unit || 'units'}. Please consider restocking.`;
                    
                    await connection.query(
                        'INSERT INTO staff_notifications (staff_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
                        [staff.staff_id, supplierTitle, supplierMessage, 'LOW_STOCK']
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
            SELECT rr.id, rr.inventory_id, rr.supplier_id, rr.quantity, rr.status, rr.created_at,
                   i.item_name, i.unit, s.name as supplier_name,
                   su.full_name as requester_name, 'RETAILER' as origin
            FROM restock_requests rr
            JOIN inventory i ON rr.inventory_id = i.id
            JOIN suppliers s ON rr.supplier_id = s.id
            LEFT JOIN staff_users su ON rr.requested_by = su.id
            
            UNION ALL
            
            SELECT sr.id, sr.inventory_id, sr.supplier_id, sr.quantity, sr.status, sr.created_at,
                   i.item_name, i.unit, s.name as supplier_name,
                   'Supplier Offer' as requester_name, 'SUPPLIER' as origin
            FROM supplier_requests sr
            JOIN inventory i ON sr.inventory_id = i.id
            JOIN suppliers s ON sr.supplier_id = s.id

            ORDER BY created_at DESC
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
        const { status, origin } = req.body; // 'RETAILER' or 'SUPPLIER'
        const admin_id = req.user.userId;

        await connection.beginTransaction();

        // 1. Update status in correct table
        const table = (origin === 'SUPPLIER') ? 'supplier_requests' : 'restock_requests';
        await connection.query(
            `UPDATE ${table} SET status = ? ${origin !== 'SUPPLIER' ? ', approved_by = ?' : ''} WHERE id = ?`,
            origin === 'SUPPLIER' ? [status, id] : [status, admin_id, id]
        );

        // 1.5 If status is APPROVED, create a supplier_order (both RETAILER and SUPPLIER origins)
        if (status === 'APPROVED') {
            const [reqInfo] = await connection.query(`SELECT inventory_id, supplier_id, quantity FROM ${table} WHERE id = ?`, [id]);
            if (reqInfo.length > 0) {
                const { supplier_id, quantity, inventory_id } = reqInfo[0];
                const [[item]] = await connection.query('SELECT item_name FROM inventory WHERE id = ?', [inventory_id]);
                
                // If the supplier initiated it, they already agreed, so it skips PENDING
                const newOrderStatus = origin === 'SUPPLIER' ? 'APPROVED' : 'PENDING';
                const notes = origin === 'SUPPLIER' ? `Approved Supplier Offer for ${item.item_name}` : `Restock Request for ${item.item_name}`;

                await connection.query(
                    'INSERT INTO supplier_orders (supplier_id, inventory_id, quantity, total_amount, status, notes, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [supplier_id, inventory_id, quantity, 0, newOrderStatus, notes, 'Normal']
                );

                // Notify Supplier Staff
                const [supplierStaff] = await connection.query('SELECT staff_id FROM supplier_staff WHERE supplier_id = ?', [supplier_id]);
                for (const staff of supplierStaff) {
                    await connection.query(
                        'INSERT INTO staff_notifications (staff_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
                        [staff.staff_id, origin === 'SUPPLIER' ? 'Offer Approved' : 'New Order from Restaurant', origin === 'SUPPLIER' ? `Your offer to supply "${item.item_name}" was approved.` : `A new restock order has been placed for "${item.item_name}".`, 'INFO']
                    );
                }
            }
        }

        // 2. If COMPLETED, auto-update inventory (used mainly for manual completion of old restock logic without supplier_orders)
        if (status === 'COMPLETED') {
            const [request] = await connection.query(`SELECT inventory_id, quantity, supplier_id FROM ${table} WHERE id = ?`, [id]);
            if (request.length > 0) {
                const { inventory_id, quantity, supplier_id } = request[0];
                
                // Add to inventory
                await connection.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [quantity, inventory_id]);
                
                // Refresh status logic
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
                    VALUES (?, 'RESTOCK', ?, ?, ?)
                `, [
                    inventory_id, 
                    quantity, 
                    origin === 'SUPPLIER' ? 'Stock received from supplier offer' : 'Automatic update from completed restock request',
                    admin_id
                ]);

                // Create Supplier History record
                await connection.query(
                    "INSERT INTO supplier_history (supplier_id, inventory_id, quantity, order_id) VALUES (?, ?, ?, null)",
                    [supplier_id, inventory_id, quantity]
                );

                // Trigger Alerts
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
        const [rows] = await pool.query('SELECT * FROM suppliers WHERE status IN ("active", "Approved")');
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
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        const startDate = req.query.startDate || monthStart;
        const endDate = req.query.endDate || today;
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

        // Item Usage from Order Analytics (Resilient join on item_name)
        const [usageStats] = await pool.query(`
            SELECT i.item_name, SUM(oa.quantity) as used_quantity
            FROM order_analytics oa
            JOIN inventory i ON oa.item_name = i.item_name
            WHERE oa.created_at >= ? AND oa.created_at <= ?
            GROUP BY i.id
            ORDER BY used_quantity DESC
            LIMIT 10
        `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

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
/**
 * GET /api/inventory/supplier-orders
 * Get all active supplier orders
 */
export const getSupplierOrders = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT so.*, s.name as supplier_name, i.item_name, i.unit
            FROM supplier_orders so
            JOIN suppliers s ON so.supplier_id = s.id
            LEFT JOIN inventory i ON so.inventory_id = i.id
            ORDER BY so.created_at DESC
        `);
        res.json({ orders: rows });
    } catch (error) {
        console.error('Fetch supplier orders error:', error);
        res.status(500).json({ message: 'Failed to fetch supplier orders' });
    }
};

/**
 * POST /api/inventory/supplier-orders
 * Create a direct supplier order
 */
export const createSupplierOrder = async (req, res) => {
    try {
        const { inventory_id, supplier_id, quantity, total_amount, notes } = req.body;
        
        await pool.query(
            'INSERT INTO supplier_orders (supplier_id, inventory_id, quantity, total_amount, status, notes, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [supplier_id, inventory_id, quantity, total_amount || 0, 'PENDING', notes || 'Direct Order', 'Normal']
        );
        res.status(201).json({ success: true, message: 'Supplier order placed successfully' });
    } catch (error) {
        console.error('Create supplier order error:', error);
        res.status(500).json({ message: 'Failed to create supplier order' });
    }
};

/**
 * PATCH /api/inventory/supplier-orders/:id/status
 */
export const updateSupplierOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await pool.query('UPDATE supplier_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
        
        res.json({ success: true, message: `Order status updated to ${status}` });
    } catch (error) {
        console.error('Update supplier order error:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
};
