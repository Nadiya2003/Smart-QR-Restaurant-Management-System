
import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        const customerId = req.user.userId;
        
        // Use a more robust check that avoids broad LIKE patterns
        const [rows] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM delivery_orders WHERE customer_id = ? OR (customer_id IS NULL AND phone = (SELECT phone FROM online_customers WHERE id = ? AND phone IS NOT NULL))) + 
                (SELECT COUNT(*) FROM takeaway_orders WHERE customer_id = ? OR (customer_id IS NULL AND phone = (SELECT phone FROM online_customers WHERE id = ? AND phone IS NOT NULL))) as total_orders,
                
                (SELECT COALESCE(SUM(total_price), 0) FROM delivery_orders WHERE (customer_id = ? OR (customer_id IS NULL AND phone = (SELECT phone FROM online_customers WHERE id = ? AND phone IS NOT NULL))) AND payment_status = 'PAID') +
                (SELECT COALESCE(SUM(total_price), 0) FROM takeaway_orders WHERE (customer_id = ? OR (customer_id IS NULL AND phone = (SELECT phone FROM online_customers WHERE id = ? AND phone IS NOT NULL))) AND payment_status = 'PAID') as total_spent,
                
                (SELECT COUNT(*) FROM delivery_orders WHERE (customer_id = ? OR (customer_id IS NULL AND phone = (SELECT phone FROM online_customers WHERE id = ? AND phone IS NOT NULL))) AND order_status != 'COMPLETED') +
                (SELECT COUNT(*) FROM takeaway_orders WHERE (customer_id = ? OR (customer_id IS NULL AND phone = (SELECT phone FROM online_customers WHERE id = ? AND phone IS NOT NULL))) AND order_status != 'COMPLETED') as active_orders
        `, [customerId, customerId, customerId, customerId, customerId, customerId, customerId, customerId, customerId, customerId, customerId, customerId]);

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
        const userEmail = req.user.email;

        // 1. Get User Data
        const [users] = await pool.query(
            "SELECT id, name, email, phone, loyalty_points, profile_image, created_at FROM online_customers WHERE id = ? OR email = ?",
            [userId, userEmail]
        );

        if (users.length === 0) return res.status(404).json({ message: "User not found" });
        const profile = users[0];
        const currentUserId = profile.id;

        // 2. Get Orders (Strict match to avoid showing other's orders)
        let allOrders = [];
        try {
            const phone = profile.phone || 'NON_MATCHING';
            
            const [dOrders] = await pool.query(
                `SELECT id, 'DELIVERY' as type, order_status, created_at, total_price 
                 FROM delivery_orders 
                 WHERE customer_id = ? OR (customer_id IS NULL AND phone = ?)`,
                [currentUserId, phone]
            );

            const [tOrders] = await pool.query(
                `SELECT id, 'TAKEAWAY' as type, order_status, created_at, total_price 
                 FROM takeaway_orders 
                 WHERE customer_id = ? OR (customer_id IS NULL AND phone = ?)`,
                [currentUserId, phone]
            );

            const [dineOrders] = await pool.query(
                `SELECT o.id, 'DINE-IN' as type, os.name as order_status, o.created_at, o.total_price 
                 FROM orders o
                 LEFT JOIN order_statuses os ON o.status_id = os.id
                 WHERE o.customer_id = ? OR (o.customer_id IS NULL AND o.phone = ?)`,
                [currentUserId, phone]
            );

            allOrders = [...dOrders, ...tOrders, ...dineOrders]
                .map(o => ({ ...o, order_status: (o.order_status || 'PENDING').toUpperCase() }))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (orderError) {
            console.error("Order fetch error:", orderError.message);
        }

        // 3. Get Reservations (Strict match)
        let allBookings = [];
        try {
            const phone = profile.phone || 'NON_MATCHING';
            const name = profile.name || 'NON_MATCHING';

            const [reservations] = await pool.query(
                `SELECT r.id, r.guest_count as guests, r.reservation_date, r.reservation_time, 
                        r.status, r.created_at, t.table_number, da.area_name, r.special_requests, 'TABLE' as booking_type
                 FROM reservations r
                 LEFT JOIN restaurant_tables t ON r.table_id = t.id
                 LEFT JOIN dining_areas da ON r.area_id = da.id
                 WHERE r.customer_id = ? 
                    OR (r.customer_id IS NULL AND r.mobile_number = ?)
                    OR (r.customer_id IS NULL AND r.customer_name = ?)
                 ORDER BY r.id DESC`,
                [currentUserId, phone, name]
            );
            allBookings = [...reservations];
        } catch (resError) {
            console.error("Res fetch error:", resError.message);
        }

        // 4. Get Event Bookings (These don't have customer_id yet, using phone/name strict match)
        try {
            const phone = profile.phone || 'NON_MATCHING';
            const name = profile.name || 'NON_MATCHING';
            
            const [bookings] = await pool.query(
                `SELECT b.id, b.guests, b.date as reservation_date, b.time as reservation_time, 
                        b.status, b.created_at, 'EVENT/PARTY' as booking_type
                 FROM bookings b
                 WHERE b.phone = ? OR b.customer_name = ?
                 ORDER BY b.id DESC`,
                [phone, name]
            );
            allBookings = [...allBookings, ...bookings];
        } catch (e) {
            console.warn("Bookings fetch error:", e.message);
        }

        // Sort combined reservations and bookings by creation time (LATEST FIRST)
        // If created_at exists, use it. Otherwise fallback to date/time.
        allBookings.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at) : new Date(`${a.reservation_date} ${a.reservation_time}`);
            const dateB = b.created_at ? new Date(b.created_at) : new Date(`${b.reservation_date} ${b.reservation_time}`);
            return dateB - dateA;
        });

        res.json({
            profile: profile,
            orders: allOrders.slice(0, 50),
            reservations: allBookings.slice(0, 50)
        });
    } catch (err) {
        console.error("getAccountData error:", err);
        res.status(500).json({ message: "Failed to fetch account data" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userEmail = req.user.email;
        const { name, phone } = req.body;

        // Find the correct ID in online_customers
        const [users] = await pool.query("SELECT id FROM online_customers WHERE id = ? OR email = ?", [userId, userEmail]);
        if (users.length === 0) return res.status(404).json({ message: "User not found" });

        const currentUserId = users[0].id;

        await pool.query(
            "UPDATE online_customers SET name = ?, phone = ? WHERE id = ?",
            [name, phone, currentUserId]
        );

        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("updateProfile error:", err);
        res.status(500).json({ message: "Failed to update profile" });
    }
};
