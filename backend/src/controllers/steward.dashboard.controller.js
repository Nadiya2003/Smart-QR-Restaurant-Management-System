import pool from '../config/db.js';

/**
 * GET /api/staff/dashboard/tables
 * Fetch all tables with their status and current order info
 */
export const getTableStatus = async (req, res) => {
    try {
        const [tables] = await pool.query(`
            SELECT rt.*, da.area_name as area_name,
                   o.id as current_order_id, o.status_id, os.name as order_status,
                   su.full_name as steward_name,
                   (SELECT COUNT(*) FROM reservations r 
                    WHERE r.table_id = rt.id AND r.reservation_status IN ('CONFIRMED', 'PENDING') 
                    AND r.reservation_date = CURDATE()) as today_reservations
            FROM restaurant_tables rt
            LEFT JOIN dining_areas da ON rt.area_id = da.id
            LEFT JOIN orders o ON rt.id = o.table_id AND o.status_id NOT IN (
                SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED')
            )
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            ORDER BY rt.table_number ASC
        `);
        res.json({ tables });
    } catch (error) {
        console.error('Get table status error:', error);
        res.status(500).json({ message: 'Failed to fetch table status' });
    }
};

/**
 * GET /api/staff/orders/steward/:stewardId
 * Fetch active orders for a specific steward
 */
export const getStewardOrders = async (req, res) => {
    try {
        const { stewardId } = req.params;
        // Fetch all active dine-in orders — either assigned to this steward OR unassigned
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name,
                   CASE WHEN o.customer_id IS NOT NULL THEN 'Registered' ELSE 'Guest' END as customer_type,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)
                   ) FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id) as items,
                   COALESCE(o.total_price,
                       (SELECT SUM(oa.total_price) FROM order_analytics oa WHERE oa.order_id = o.id)
                   ) as total_price
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE s.staff_id = ?
              AND (os.name IS NULL OR os.name NOT IN ('COMPLETED', 'CANCELLED'))
            ORDER BY o.created_at DESC
        `, [stewardId]);
        
        // Parse items if returned as string
        const parsedOrders = orders.map(o => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
        }));
        
        res.json({ orders: parsedOrders });
    } catch (error) {
        console.error('Get steward orders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};

/**
 * POST /api/staff/orders/:id/add-item
 */
export const addOrderItem = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // order_id
        const { menu_item_id, quantity, price } = req.body;

        await connection.beginTransaction();

        await connection.query(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
            [id, menu_item_id, quantity, price]
        );

        // Update total price in orders table if column exists
        await connection.query(
            'UPDATE orders SET total_price = total_price + ? WHERE id = ?',
            [price * quantity, id]
        );

        await connection.commit();
        res.json({ message: 'Item added successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Add order item error:', error);
        res.status(500).json({ message: 'Failed to add item' });
    } finally {
        connection.release();
    }
};

/**
 * POST /api/staff/orders/:id/cancel-request
 */
export const requestOrderCancel = async (req, res) => {
    try {
        const { id } = req.params; // order_id
        const { reason } = req.body;
        const requested_by = req.user.userId;

        await pool.query(
            'INSERT INTO cancel_requests (order_id, requested_by, reason, status) VALUES (?, ?, ?, "pending")',
            [id, requested_by, reason]
        );

        // Notify Admin
        await pool.query(
            'INSERT INTO notifications (user_id, role_id, title, message, type) VALUES (?, ?, ?, ?, ?)',
            [0, 1, 'Cancellation Request', `Order #${id} cancellation requested by steward. Reason: ${reason}`, 'cancellation']
        );

        res.json({ message: 'Cancellation request sent to admin' });
    } catch (error) {
        console.error('Cancel request error:', error);
        res.status(500).json({ message: 'Failed to send cancel request' });
    }
};

/**
 * GET /api/staff/orders/history/:stewardId
 */
export const getStewardHistory = async (req, res) => {
    try {
        const { stewardId } = req.params;
        const { filter = 'today' } = req.query;

        let timeFilter = 'AND DATE(o.created_at) = CURDATE()';
        if (filter === 'week') timeFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        if (filter === 'month') timeFilter = 'AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            WHERE s.staff_id = ? ${timeFilter}
            ORDER BY o.created_at DESC
        `, [stewardId]);

        res.json({ orders });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ message: 'Failed to fetch history' });
    }
};

/**
 * GET /api/staff/notifications/:userId
 */
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [notifications] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? OR (role_id = (SELECT role_id FROM staff_users WHERE id = ?)) ORDER BY created_at DESC LIMIT 50',
            [userId, userId]
        );
        res.json({ notifications });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

/**
 * POST /api/steward-dashboard/duty/check-in
 */
export const checkIn = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const [staff] = await connection.query(
            "SELECT su.full_name, sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [userId]
        );
        const name = staff[0]?.full_name || 'Staff';
        const role = staff[0]?.role_name || 'STEWARD';
        const today = new Date().toISOString().split('T')[0];

        await connection.beginTransaction();

        // 1. Update steward availability
        await connection.query('UPDATE stewards SET is_available = 1 WHERE staff_id = ?', [userId]);

        // 2. Create/Update attendance
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
            // Idempotent: ensure check_out_time is null if previously checked out
            await connection.query(
                'UPDATE staff_attendance SET check_out_time = NULL, status = "PRESENT" WHERE id = ?',
                [existing[0].id]
            );
        }

        await connection.commit();
        res.json({ message: 'Checked in successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Check-in failed', error: error.message });
    } finally {
        connection.release();
    }
};

/**
 * POST /api/steward-dashboard/duty/check-out
 */
export const checkOut = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        await connection.beginTransaction();

        // 1. Update steward availability
        await connection.query('UPDATE stewards SET is_available = 0 WHERE staff_id = ?', [userId]);

        // 2. Update attendance logout
        await connection.query(
            'UPDATE staff_attendance SET check_out_time = NOW() WHERE staff_id = ? AND date = ? AND check_out_time IS NULL',
            [userId, today]
        );

        await connection.commit();
        res.json({ message: 'Checked out successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Check-out failed', error: error.message });
    } finally {
        connection.release();
    }
};

/**
 * GET /api/steward-dashboard/duty/status
 */
export const getDutyStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.query('SELECT is_available FROM stewards WHERE staff_id = ?', [userId]);
        const onDuty = rows.length > 0 ? rows[0].is_available === 1 : false;
        res.json({ onDuty });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch duty status' });
    }
};

/**
 * GET /api/steward-dashboard/reservations
 */
export const getUpcomingReservations = async (req, res) => {
    try {
        const [reservations] = await pool.query(`
            SELECT r.*, 
                   rt.table_number,
                   r.guest_count as guests_count
            FROM reservations r
            LEFT JOIN restaurant_tables rt ON r.table_id = rt.id
            WHERE r.reservation_date >= CURDATE()
            ORDER BY r.reservation_date ASC, r.reservation_time ASC
        `);
        res.json({ reservations });
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ message: 'Failed to fetch reservations' });
    }
};
