import pool from '../config/db.js';

/**
 * GET /api/supplier/dashboard-stats
 */
export const getSupplierDashboardStats = async (req, res) => {
    try {
        const staffUserId = req.user.userId;
        
        // 1. Get Supplier ID for this staff member
        const [staff] = await pool.query(
            "SELECT supplier_id FROM supplier_staff WHERE staff_id = ?",
            [staffUserId]
        );
        
        if (staff.length === 0 || !staff[0].supplier_id) {
            return res.status(403).json({ message: "No supplier company linked to your account" });
        }
        
        const supplierId = staff[0].supplier_id;

        // 2. Stats
        const [[{ totalItems }]] = await pool.query(
            "SELECT COUNT(*) as totalItems FROM inventory WHERE supplier_id = ?",
            [supplierId]
        );
        
        const [[{ lowStockCount }]] = await pool.query(
            "SELECT COUNT(*) as lowStockCount FROM inventory WHERE supplier_id = ? AND status IN ('Low Stock', 'Out of Stock')",
            [supplierId]
        );
        
        const [[{ pendingRequests }]] = await pool.query(
            "SELECT COUNT(*) as pendingRequests FROM (SELECT id FROM supplier_requests WHERE supplier_id = ? AND status = 'PENDING' UNION ALL SELECT id FROM supplier_orders WHERE supplier_id = ? AND status = 'PENDING') combined",
            [supplierId, supplierId]
        );

        res.json({
            stats: {
                totalItems,
                lowStockCount,
                pendingRequests
            }
        });
    } catch (error) {
        console.error('Supplier dashboard stats error:', error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /api/supplier/items
 */
export const getSuppliedItems = async (req, res) => {
    try {
        const staffUserId = req.user.userId;
        const [staff] = await pool.query("SELECT supplier_id FROM supplier_staff WHERE staff_id = ?", [staffUserId]);
        if (staff.length === 0 || !staff[0].supplier_id) return res.status(403).json({ message: "No supplier linked" });
        const supplierId = staff[0].supplier_id;

        const [items] = await pool.query(
            "SELECT id, item_name, quantity, unit, status, min_level, updated_at FROM inventory WHERE supplier_id = ? ORDER BY item_name ASC",
            [supplierId]
        );
        res.json({ items });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch items" });
    }
};

/**
 * GET /api/supplier/admin-requests
 */
export const getAdminRequests = async (req, res) => {
    try {
        const staffUserId = req.user.userId;
        const [staff] = await pool.query("SELECT supplier_id FROM supplier_staff WHERE staff_id = ?", [staffUserId]);
        const supplierId = staff[0].supplier_id;

        const [requests] = await pool.query(
            `SELECT so.*, i.item_name, i.unit, 'Normal' as priority 
             FROM supplier_orders so 
             JOIN inventory i ON so.inventory_id = i.id
             WHERE so.supplier_id = ? AND so.status IN ('PENDING', 'APPROVED')
             ORDER BY so.created_at DESC`,
            [supplierId]
        );
        res.json({ requests });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch admin requests" });
    }
};

/**
 * POST /api/supplier/supply-request
 */
export const sendSupplyRequest = async (req, res) => {
    try {
        const staffUserId = req.user.userId;
        const { inventory_id, quantity, message } = req.body;
        const [staff] = await pool.query("SELECT supplier_id FROM supplier_staff WHERE staff_id = ?", [staffUserId]);
        if (staff.length === 0 || !staff[0].supplier_id) return res.status(403).json({ message: "Not authorized" });
        const supplierId = staff[0].supplier_id;

        await pool.query(
            "INSERT INTO supplier_requests (supplier_id, inventory_id, quantity, status, message) VALUES (?, ?, ?, 'PENDING', ?)",
            [supplierId, inventory_id, quantity, message]
        );

        // Notify Admin/Inventory manager
        const [[supplier]] = await pool.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
        const [[item]] = await pool.query('SELECT item_name FROM inventory WHERE id = ?', [inventory_id]);
        
        const [roles] = await pool.query('SELECT id FROM staff_roles WHERE role_name IN ("admin", "inventory_manager")');
        for (const role of roles) {
            await pool.query(
                "INSERT INTO staff_notifications (role_id, title, message, notification_type) VALUES (?, ?, ?, ?)",
                [
                    role.id, 
                    "New Supply Request", 
                    `${supplier.name} has sent a request to restock "${item.item_name}" (${quantity} units).`, 
                    "SUPPLIER_OFFER"
                ]
            );
        }

        res.status(201).json({ success: true, message: 'Supply request sent' });
    } catch (error) {
        res.status(500).json({ message: "Failed to send request" });
    }
};

/**
 * GET /api/supplier/history
 */
export const getSupplyHistory = async (req, res) => {
    try {
        const staffUserId = req.user.userId;
        const [staff] = await pool.query("SELECT supplier_id FROM supplier_staff WHERE staff_id = ?", [staffUserId]);
        const supplierId = staff[0].supplier_id;

        const [history] = await pool.query(
            `SELECT sh.*, i.item_name, i.unit 
             FROM supplier_history sh 
             JOIN inventory i ON sh.inventory_id = i.id 
             WHERE sh.supplier_id = ? 
             ORDER BY sh.delivered_at DESC`,
            [supplierId]
        );
        res.json({ history });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch history" });
    }
};

/**
 * PATCH /api/supplier/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await pool.query(
            "UPDATE supplier_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [status, id]
        );

        // Notify Admins
        const [[order]] = await pool.query('SELECT inventory_id FROM supplier_orders WHERE id = ?', [id]);
        if (order) {
            const [[item]] = await pool.query('SELECT item_name FROM inventory WHERE id = ?', [order.inventory_id]);
            const [roles] = await pool.query('SELECT id FROM staff_roles WHERE role_name IN ("admin", "inventory_manager")');
            for (const role of roles) {
                await pool.query(
                    'INSERT INTO staff_notifications (role_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
                    [role.id, 'Order Update', `Supplier has updated the status of order for "${item.item_name}" to ${status}.`, 'INFO']
                );
            }
        }

        res.json({ success: true, message: `Order marked as ${status}` });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status" });
    }
};

/**
 * PATCH /api/supplier/orders/:id/delivered
 */
export const markOrderDelivered = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const staffUserId = req.user.userId;

        await connection.beginTransaction();

        // 1. Update order status
        await connection.query(
            "UPDATE supplier_orders SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [id]
        );

        // 2. Fetch order details
        const [[order]] = await connection.query("SELECT * FROM supplier_orders WHERE id = ?", [id]);
        
        if (order && order.inventory_id && order.quantity > 0) {
            const { inventory_id, quantity, supplier_id } = order;
            const [[item]] = await connection.query("SELECT item_name FROM inventory WHERE id = ?", [inventory_id]);

            // 3. Update Inventory
            await connection.query("UPDATE inventory SET quantity = quantity + ? WHERE id = ?", [quantity, inventory_id]);

            // 4. Update Status logic
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

            // 5. Log stock history
            await connection.query(`
                INSERT INTO stock_history (inventory_id, action_type, quantity, reason, performed_by)
                VALUES (?, 'RESTOCK', ?, ?, ?)
            `, [inventory_id, quantity, `Stock received from Supplier Order #${id}`, staffUserId]);

            // 6. Record Supplier History
            await connection.query(
                "INSERT INTO supplier_history (supplier_id, inventory_id, quantity, order_id) VALUES (?, ?, ?, ?)",
                [supplier_id, inventory_id, quantity, id]
            );

            // 7. Notify Admins/Inventory Managers
            const [roles] = await connection.query('SELECT id FROM staff_roles WHERE role_name IN ("admin", "inventory_manager")');
            for (const role of roles) {
                await connection.query(
                    'INSERT INTO staff_notifications (role_id, title, message, notification_type) VALUES (?, ?, ?, ?)',
                    [role.id, 'Stock Received', `Item "${item.item_name}" has been restocked by the supplier.`, 'INFO']
                );
            }
        }

        await connection.commit();
        res.json({ success: true, message: "Order marked as delivered and inventory updated" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: "Failed to update order" });
    } finally {
        connection.release();
    }
};
