
import pool from '../config/db.js';

// --- STAFF DASHBOARD DATA ---
export const getAssignedOrders = async (req, res) => {
    try {
        const staffId = req.user.userId;
        const [staff] = await pool.query(`
            SELECT u.*, r.role_name 
            FROM staff_users u
            JOIN staff_roles r ON u.role_id = r.id
            WHERE u.id = ?`,
            [staffId]
        );

        if (staff.length === 0) return res.status(404).json({ message: "User not found" });

        const roleName = staff[0].role_name.toLowerCase();
        // Assuming roles: manager, cashier, steward, etc.
        const isManagerOrCashier = roleName === 'manager' || roleName === 'cashier' || roleName === 'admin';

        let query = `
            SELECT o.id, o.created_at,
                   os.name as status,
                   ot.name as type,
                   COALESCE(u.name, 'Guest') as customer_name,
                   (SELECT COALESCE(SUM(oa.total_price), 0) FROM order_analytics oa WHERE oa.order_id = o.id AND oa.order_source = 'DINE-IN') as total
            FROM orders o 
            LEFT JOIN online_customers u ON o.customer_id = u.id 
            JOIN order_statuses os ON o.status_id = os.id
            JOIN order_types ot ON o.order_type_id = ot.id
            WHERE 1=1 `;
        let params = [];

        if (!isManagerOrCashier) {
            // For steward, show orders assigned to them
            query += " AND o.steward_id = ? ";
            params.push(staffId);
        }

        query += " ORDER BY o.created_at DESC";

        const [orders] = await pool.query(query, params);

        // Fetch items for each order
        for (let order of orders) {
            const [items] = await pool.query(`
                SELECT oa.item_id as id, oa.item_name as name, oa.quantity, oa.unit_price as price, oa.total_price
                FROM order_analytics oa
                WHERE oa.order_id = ? AND oa.order_source = 'DINE-IN'`, [order.id]);
            order.items = items;
        }

        res.json({ orders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching staff orders' });
    }
};

// --- WORK ACTIONS ---
export const updateStaffOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // VALID ENUMS: PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
        const targetStatus = status.toUpperCase();

        const [statusRows] = await pool.query("SELECT id FROM order_statuses WHERE name = ?", [targetStatus]);
        if (statusRows.length === 0) return res.status(400).json({ message: "Invalid status" });
        const statusId = statusRows[0].id;

        await pool.query("UPDATE orders SET status_id = ? WHERE id = ?", [statusId, id]);
        res.json({ message: `Order #${id} set to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};

export const getFilteredOrders = async (req, res) => {
    try {
        const { type } = req.params; // DINE_IN, TAKEAWAY, DELIVERY

        const [typeRows] = await pool.query("SELECT id FROM order_types WHERE name = ?", [type.toUpperCase()]);
        if (typeRows.length === 0) return res.json({ orders: [] });
        const typeId = typeRows[0].id;

        const [orders] = await pool.query(`
            SELECT o.*, os.name as status, ot.name as type
            FROM orders o
            JOIN order_statuses os ON o.status_id = os.id
            JOIN order_types ot ON o.order_type_id = ot.id
            WHERE o.order_type_id = ?`,
            [typeId]
        );
        res.json({ orders });
    } catch (err) {
        res.status(500).json(err);
    }
};

export const processStewardAction = async (req, res) => {
    try {
        const { orderId, action } = req.body;
        // Action: ACCEPT, REJECT
        const status = action === 'ACCEPT' ? 'CONFIRMED' : 'CANCELLED';

        const [statusRows] = await pool.query("SELECT id FROM order_statuses WHERE name = ?", [status]);
        const statusId = statusRows[0].id;

        // Optionally assign proper steward if ACCEPTING (if not already assigned)
        // const staffId = req.user.userId;
        // await pool.query("UPDATE orders SET status_id = ?, steward_id = ? WHERE id = ?", [statusId, staffId, orderId]);

        await pool.query("UPDATE orders SET status_id = ? WHERE id = ?", [statusId, orderId]);
        res.json({ message: `Order ${action}ED` });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};

export const sendNotification = async (req, res) => {
    try {
        const { stewardId, message, type } = req.body;

        if (!stewardId) return res.status(400).json({ message: "Steward ID required" });

        // Using notifications table
        await pool.query(
            "INSERT INTO notifications (user_id, message, title) VALUES (?, ?, ?)",
            [stewardId, message, type || 'GENERAL']
        );

        res.json({ message: "Notification sent successfully" });
    } catch (err) {
        console.error("Notification Error:", err);
        res.status(500).json({ message: "Failed to send notification" });
    }
};
