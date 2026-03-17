import pool from '../config/db.js';

/**
 * GET /api/kitchen/orders
 * Fetch all active orders for the kitchen (excluding beverages)
 */
export const getKitchenOrders = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name, ot.name as order_type_name,
                   COALESCE(su.name, su.full_name, su.username) as steward_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price, 'category', cat.name)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id AND cat.name != 'Beverages') as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name NOT IN ('COMPLETED', 'CANCELLED')
            ORDER BY o.created_at ASC
        `);

        console.log(`[Kitchen] Orders found in DB: ${orders.length}`);

        // Filter out orders that have no kitchen items (all items were beverages)
        const kitchenOrders = orders.filter(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            o.items = items;
            return items && items.length > 0;
        });

        console.log(`[Kitchen] After filtering beverages: ${kitchenOrders.length}`);
        res.json({ orders: kitchenOrders });
    } catch (error) {
        console.error('Kitchen orders error:', error);
        res.status(500).json({ message: 'Failed to fetch kitchen orders' });
    }
};

/**
 * GET /api/bar/orders
 * Fetch all active orders for the bar (only beverages)
 */
export const getBarOrders = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name, ot.name as order_type_name,
                   COALESCE(su.name, su.full_name, su.username) as steward_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price, 'category', cat.name)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id AND cat.name = 'Beverages') as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name NOT IN ('COMPLETED', 'CANCELLED')
            ORDER BY o.created_at ASC
        `);

        console.log(`[Bar] Orders found in DB: ${orders.length}`);

        // Filter out orders that have no bar items (all items were food)
        const barOrders = orders.filter(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            o.items = items;
            return items && items.length > 0;
        });

        console.log(`[Bar] After filtering food: ${barOrders.length}`);
        res.json({ orders: barOrders });
    } catch (error) {
        console.error('Bar orders error:', error);
        res.status(500).json({ message: 'Failed to fetch bar orders' });
    }
};

/**
 * GET /api/kitchen-bar/inventory
 */
export const getInventory = async (req, res) => {
    try {
        const { category } = req.query;
        let query = `
            SELECT i.*, s.name as supplier_name 
            FROM inventory i 
            LEFT JOIN suppliers s ON i.supplier_id = s.id
        `;
        const params = [];

        if (category) {
            query += " WHERE i.category = ?";
            params.push(category);
        }

        query += " ORDER BY i.item_name ASC";
        
        const [rows] = await pool.query(query, params);
        res.json({ inventory: rows });
    } catch (error) {
        console.error('Fetch inventory error:', error);
        res.status(500).json({ message: 'Failed to fetch inventory' });
    }
};

/**
 * GET /api/kitchen-bar/duty/status
 */
export const getDutyStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Check if there is an active attendance record for today
        const [rows] = await pool.query(
            'SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ? AND check_out_time IS NULL',
            [userId, today]
        );
        
        const onDuty = rows.length > 0;
        res.json({ onDuty });
    } catch (error) {
        console.error('Duty status error:', error);
        res.status(500).json({ message: 'Failed to fetch duty status' });
    }
};

/**
 * POST /api/kitchen-bar/duty/check-in
 */
export const checkIn = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Fetch staff info
        const [staff] = await connection.query(
            "SELECT su.full_name, sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [userId]
        );
        const name = staff[0]?.full_name || 'Staff';
        let role = staff[0]?.role_name || 'STAFF';

        await connection.beginTransaction();

        // 1. Update role-specific table if it's a steward (optional sync)
        if (role.toLowerCase() === 'steward') {
            await connection.query('UPDATE stewards SET is_available = 1 WHERE staff_id = ?', [userId]);
        }

        // 2. Manage attendance
        const [existing] = await connection.query(
            'SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?',
            [userId, today]
        );

        if (existing.length === 0) {
            await connection.query(
                'INSERT INTO staff_attendance (staff_id, name, role, date, check_in_time, status) VALUES (?, ?, ?, ?, NOW(), "PRESENT")',
                [userId, name, role, today]
            );
        } else {
            await connection.query(
                'UPDATE staff_attendance SET check_out_time = NULL, status = "PRESENT" WHERE id = ?',
                [existing[0].id]
            );
        }

        await connection.commit();
        res.json({ message: 'Checked in successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Check-in failed' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * POST /api/kitchen-bar/duty/check-out
 */
export const checkOut = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Fetch staff info to check role
        const [staff] = await connection.query(
            "SELECT sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [userId]
        );
        const role = staff[0]?.role_name || '';

        await connection.beginTransaction();

        if (role.toLowerCase() === 'steward') {
            await connection.query('UPDATE stewards SET is_available = 0 WHERE staff_id = ?', [userId]);
        }

        await connection.query(
            'UPDATE staff_attendance SET check_out_time = NOW() WHERE staff_id = ? AND date = ? AND check_out_time IS NULL',
            [userId, today]
        );

        await connection.commit();
        res.json({ message: 'Checked out successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Check-out error:', error);
        res.status(500).json({ message: 'Check-out failed' });
    } finally {
        if (connection) connection.release();
    }
};
/**
 * GET /api/kitchen/history
 */
export const getKitchenHistory = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name, ot.name as order_type_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('name', mi.name, 'quantity', oi.quantity)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id AND cat.name != 'Beverages') as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name IN ('COMPLETED', 'CANCELLED', 'FINISHED', 'SERVED')
            AND DATE(o.created_at) = CURDATE()
            ORDER BY o.updated_at DESC
        `);

        const history = orders.filter(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            o.items = items;
            return items && items.length > 0;
        });

        res.json({ history });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch kitchen history' });
    }
};

/**
 * GET /api/bar/history
 */
export const getBarHistory = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name, ot.name as order_type_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('name', mi.name, 'quantity', oi.quantity)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id AND cat.name = 'Beverages') as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name IN ('COMPLETED', 'CANCELLED', 'FINISHED', 'SERVED')
            AND DATE(o.created_at) = CURDATE()
            ORDER BY o.updated_at DESC
        `);

        const history = orders.filter(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            o.items = items;
            return items && items.length > 0;
        });

        res.json({ history });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bar history' });
    }
};
