
import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const [rows] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM delivery_orders WHERE customer_id = ?) + 
                (SELECT COUNT(*) FROM takeaway_orders WHERE customer_id = ?) as total_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM delivery_orders WHERE customer_id = ? AND payment_status = 'PAID') +
                (SELECT COALESCE(SUM(total_price), 0) FROM takeaway_orders WHERE customer_id = ? AND payment_status = 'PAID') as total_spent,
                (SELECT COUNT(*) FROM delivery_orders WHERE customer_id = ? AND order_status != 'COMPLETED') +
                (SELECT COUNT(*) FROM takeaway_orders WHERE customer_id = ? AND order_status != 'COMPLETED') as active_orders
        `, [customerId, customerId, customerId, customerId, customerId, customerId]);

        res.json({ stats: rows[0] });
    } catch (err) {
        console.error("getDashboardStats error:", err);
        res.status(500).json({ message: "Internal server error" });
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
        console.error("submitRating error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getAccountData = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Get User Data from online_customers
        const [users] = await pool.query(
            "SELECT name, email, phone, loyalty_points, profile_image, created_at FROM online_customers WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Get Orders from both tables
        const [dOrders] = await pool.query(
            `SELECT id, 'DELIVERY' as type, order_status, created_at, total_price 
             FROM delivery_orders 
             WHERE customer_id = ?`,
            [userId]
        );

        const [tOrders] = await pool.query(
            `SELECT id, 'TAKEAWAY' as type, order_status, created_at, total_price 
             FROM takeaway_orders 
             WHERE customer_id = ?`,
            [userId]
        );

        // Combine and sort by date descending
        const allOrders = [...dOrders, ...tOrders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // 3. Get Reservations
        const [reservations] = await pool.query(
            `SELECT id, guests, reservation_date, reservation_time, status, created_at 
             FROM reservations 
             WHERE customer_id = ? 
             ORDER BY reservation_date DESC, reservation_time DESC`,
            [userId]
        );

        res.json({
            profile: users[0],
            orders: allOrders.slice(0, 10),
            reservations: reservations.slice(0, 5) // Last 5 reservations
        });
    } catch (err) {
        console.error("getAccountData error:", err);
        res.status(500).json({ message: "Failed to fetch account data" });
    }
};
