
import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const [rows] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders WHERE customer_id = ?) as total_orders,
                (SELECT SUM(total_price) FROM orders WHERE customer_id = ? AND payment_status = 'PAID') as total_spent,
                (SELECT COUNT(*) FROM orders WHERE customer_id = ? AND order_status != 'COMPLETED') as active_orders
        `, [customerId, customerId, customerId]);

        res.json({ stats: rows[0] });
    } catch (err) {
        res.status(500).json(err);
    }
};

export const submitRating = async (req, res) => {
    try {
        const { stewardId, rating, comment } = req.body;
        const customerId = req.user.userId;

        await pool.query(
            "INSERT INTO ratings (customer_id, steward_id, rating, comment) VALUES (?, ?, ?, ?)",
            [customerId, stewardId, rating, comment]
        );

        // Update Steward Average Rating
        await pool.query(`
            UPDATE stewards 
            SET rating_avg = (SELECT AVG(rating) FROM ratings WHERE steward_id = ?)
            WHERE id = ?
        `, [stewardId, stewardId]);

        res.json({ message: 'Rating submitted successfully' });
    } catch (err) {
        res.status(500).json(err);
    }
};

export const getAccountData = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Get User Data (including loyalty points)
        const [users] = await pool.query(
            "SELECT name, email, phone, loyalty_points, created_at FROM customers WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Get Recent Orders (3NF compatible)
        const [orders] = await pool.query(
            `SELECT o.id, 
                    os.name as order_status, 
                    o.created_at,
                    (SELECT COALESCE(SUM(oi.price * oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) as total_price
             FROM orders o
             JOIN order_statuses os ON o.status_id = os.id
             WHERE o.customer_id = ? 
             ORDER BY o.created_at DESC LIMIT 10`,
            [userId]
        );

        res.json({
            profile: users[0],
            orders: orders
        });
    } catch (err) {
        console.error("getAccountData error:", err);
        res.status(500).json({ message: "Failed to fetch account data" });
    }
};
