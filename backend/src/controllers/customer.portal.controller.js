
import pool from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    try {
        const customerId = req.user.userId;
        const [rows] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM delivery_orders WHERE customer_id = ? OR phone LIKE (SELECT CONCAT('%', phone, '%') FROM online_customers WHERE id = ?)) + 
                (SELECT COUNT(*) FROM takeaway_orders WHERE customer_id = ? OR phone LIKE (SELECT CONCAT('%', phone, '%') FROM online_customers WHERE id = ?)) as total_orders,
                (SELECT COALESCE(SUM(total_price), 0) FROM delivery_orders WHERE (customer_id = ? OR phone LIKE (SELECT CONCAT('%', phone, '%') FROM online_customers WHERE id = ?)) AND payment_status = 'PAID') +
                (SELECT COALESCE(SUM(total_price), 0) FROM takeaway_orders WHERE (customer_id = ? OR phone LIKE (SELECT CONCAT('%', phone, '%') FROM online_customers WHERE id = ?)) AND payment_status = 'PAID') as total_spent,
                (SELECT COUNT(*) FROM delivery_orders WHERE (customer_id = ? OR phone LIKE (SELECT CONCAT('%', phone, '%') FROM online_customers WHERE id = ?)) AND order_status != 'COMPLETED') +
                (SELECT COUNT(*) FROM takeaway_orders WHERE (customer_id = ? OR phone LIKE (SELECT CONCAT('%', phone, '%') FROM online_customers WHERE id = ?)) AND order_status != 'COMPLETED') as active_orders
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
        console.log(`[AccountData] Fetching data for userId: ${userId}, email: ${userEmail}`);

        // 1. Get User Data from online_customers (Searching by ID or Email for legacy token compatibility)
        const [users] = await pool.query(
            "SELECT id, name, email, phone, loyalty_points, profile_image, created_at FROM online_customers WHERE id = ? OR email = ?",
            [userId, userEmail]
        );

        if (users.length === 0) {
            console.warn(`[AccountData] User ${userId} / ${userEmail} not found in online_customers`);
            return res.status(404).json({ message: "User profile not found in modern system." });
        }

        const profile = users[0];
        const currentUserId = profile.id; // Use the actual ID from online_customers
        console.log(`[AccountData] Resolved profile: ${profile.name} (Effective ID: ${currentUserId})`);

        // 2. Get Orders from both tables
        let allOrders = [];
        try {
            const [dOrders] = await pool.query(
                `SELECT id, 'DELIVERY' as type, order_status, created_at, total_price 
                 FROM delivery_orders 
                 WHERE customer_id = ? OR phone = ?`,
                [currentUserId, profile.phone]
            );

            const [tOrders] = await pool.query(
                `SELECT id, 'TAKEAWAY' as type, order_status, created_at, total_price 
                 FROM takeaway_orders 
                 WHERE customer_id = ? OR phone = ?`,
                [currentUserId, profile.phone]
            );

            const [dineOrders] = await pool.query(
                `SELECT o.id, 'DINE-IN' as type, os.name as order_status, o.created_at, o.total_price 
                 FROM orders o
                 LEFT JOIN order_statuses os ON o.status_id = os.id
                 WHERE o.customer_id = ? OR o.phone = ?`,
                [currentUserId, profile.phone]
            );

            allOrders = [...dOrders, ...tOrders, ...dineOrders]
                .map(o => ({ ...o, order_status: (o.order_status || 'PENDING').toUpperCase() }))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            console.log(`[AccountData] Found ${allOrders.length} total orders`);
        } catch (orderError) {
            console.error("[AccountData] Error fetching orders:", orderError.message);
        }

        // 3. Get Reservations
        let allBookings = [];
        try {
            const [reservations] = await pool.query(
                `SELECT r.id, r.guest_count as guests, r.reservation_date, r.reservation_time, 
                        r.status, r.created_at, t.table_number, da.area_name, r.special_requests, 'TABLE' as booking_type
                 FROM reservations r
                 LEFT JOIN restaurant_tables t ON r.table_id = t.id
                 LEFT JOIN dining_areas da ON r.area_id = da.id
                 WHERE r.customer_id = ? 
                    OR (r.mobile_number IS NOT NULL AND (r.mobile_number LIKE ? OR r.mobile_number = ?))
                    OR (r.customer_name IS NOT NULL AND (r.customer_name LIKE ? OR r.customer_name = ?))
                 ORDER BY r.reservation_date DESC, r.reservation_time DESC`,
                [currentUserId, `%${profile.phone}%`, profile.phone, `%${profile.name}%`, profile.name]
            );
            allBookings = [...reservations];
            console.log(`[AccountData] Found ${reservations.length} reservations`);
        } catch (resError) {
            console.error("[AccountData] Error fetching reservations:", resError.message);
        }

        // 4. Get Bookings (Event/Party Bookings)
        try {
            const [bookings] = await pool.query(
                `SELECT b.id, b.guests, b.date as reservation_date, b.time as reservation_time, 
                        b.status, b.created_at, 'EVENT/PARTY' as booking_type
                 FROM bookings b
                 WHERE b.phone LIKE ? OR b.customer_name LIKE ?`,
                [`%${profile.phone}%`, `%${profile.name}%`]
            );
            if (bookings.length > 0) {
                allBookings = [...allBookings, ...bookings];
                console.log(`[AccountData] Found ${bookings.length} event bookings`);
            }
        } catch (e) {
            console.warn("[AccountData] Bookings table might not exist or other error:", e.message);
        }

        // Sort combined reservations and bookings by date
        allBookings.sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date));

        res.json({
            profile: users[0],
            orders: allOrders.slice(0, 50),
            reservations: allBookings.slice(0, 50)
        });
    } catch (err) {
        console.error("[AccountData] CRITICAL error:", err);
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
