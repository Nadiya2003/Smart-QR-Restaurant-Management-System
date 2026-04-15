import pool from '../config/db.js';
import transporter from '../config/mailer.js';

// --- ATTENDANCE ---
export const checkIn = async (req, res) => {
    try {
        const staffId = req.user.userId;
        const [staffRows] = await pool.query(
            "SELECT su.id, su.full_name, sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [staffId]
        );
        
        if (staffRows.length === 0) return res.status(404).json({ message: "Staff not found" });
        
        const { full_name, role_name } = staffRows[0];

        // 1. Update steward availability if role is steward
        if (role_name.toLowerCase() === 'steward') {
            await pool.query('UPDATE stewards SET is_available = 1 WHERE staff_id = ?', [staffId]);
        }

        // 2. Manage attendance record
        const [existing] = await pool.query(
            "SELECT id, check_out_time FROM staff_attendance WHERE staff_id = ? AND date = CURDATE()",
            [staffId]
        );

        if (existing.length > 0) {
            // Re-open if checked out
            await pool.query(
                "UPDATE staff_attendance SET check_out_time = NULL, status = 'PRESENT' WHERE id = ?",
                [existing[0].id]
            );
        } else {
            await pool.query(
                "INSERT INTO staff_attendance (staff_id, name, role, date, check_in_time, status) VALUES (?, ?, ?, CURDATE(), NOW(), 'PRESENT')",
                [staffId, full_name, role_name]
            );
        }

        res.json({ success: true, message: "Checked in successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Check-in failed" });
    }
};

export const checkOut = async (req, res) => {
    try {
        const staffId = req.user.userId;

        // 1. Update steward availability if role is steward
        const [staffRows] = await pool.query(
            "SELECT sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [staffId]
        );
        if (staffRows.length > 0 && staffRows[0].role_name.toLowerCase() === 'steward') {
            await pool.query('UPDATE stewards SET is_available = 0 WHERE staff_id = ?', [staffId]);
        }

        // 2. Mark attendance checkout
        const [result] = await pool.query(
            "UPDATE staff_attendance SET check_out_time = NOW(), status = 'PRESENT' WHERE staff_id = ? AND date = CURDATE() AND check_out_time IS NULL",
            [staffId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "No active check-in found to check out" });
        }

        res.json({ success: true, message: "Checked out successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Check-out failed" });
    }
};

export const getAttendance = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM staff_attendance ORDER BY date DESC, check_in_time DESC LIMIT 100");
        res.json({ attendance: rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch attendance" });
    }
};

// --- ORDERS ---
export const createPosOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const cashierId = req.user.userId;
        const { order_type, table_id, customer_name, phone, address, items, total_price, steward_id, guest_count, needed_time } = req.body;

        // 1. Get IDs for status and type
        const dbType = order_type.toUpperCase().replace('-', '_'); // Map DINE-IN to DINE_IN
        const [typeRows] = await connection.query("SELECT id FROM order_types WHERE name = ?", [dbType]);
        if (typeRows.length === 0) throw new Error(`Invalid order type: ${order_type}`);
        const typeId = typeRows[0].id;

        const [statusRows] = await connection.query("SELECT id FROM order_statuses WHERE name = ?", ['PENDING']);
        const statusId = statusRows[0].id;

        // Handle multi-table IDs (comma separated or array)
        let tableIds = [];
        if (table_id) {
            tableIds = Array.isArray(table_id) ? table_id : String(table_id).split(',').map(id => id.trim());
        }
        const primaryTableId = tableIds.length > 0 ? tableIds[0] : null;

        const [orderResult] = await connection.query(
            `INSERT INTO orders (order_type_id, status_id, table_id, steward_id, customer_name, phone, address, cashier_id, total_price, guest_count, needed_time, order_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'guest')`,
            [typeId, statusId, primaryTableId, steward_id || null, customer_name || null, phone || null, address || null, cashierId, total_price, guest_count || 0, needed_time || null]
        );
        const orderId = orderResult.insertId;

        // 3. Insert items
        for (const item of items) {
            await connection.query(
                "INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)",
                [orderId, item.id, item.quantity, item.price]
            );
        }

        // 4. Update table status if Dine-In (ALL selected tables)
        if ((order_type.toUpperCase() === 'DINE-IN' || order_type.toUpperCase() === 'DINE_IN') && tableIds.length > 0) {
            for (const tId of tableIds) {
                await connection.query("UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?", [tId]);
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, orderId, message: "Order placed successfully" });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Failed to create order", error: err.message });
    } finally {
        connection.release();
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.id, o.total_price, o.created_at, coalesce(ot.name, 'DINE_IN') as type_name, os.name as status_name,
                   'orders' as source_table, o.phone, o.customer_name, o.needed_time,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   WHERE oi.order_id = o.id) as items,
                   NULL as payment_status, pm.name as payment_method_name, NULL as order_type,
                   o.slip_image
            FROM orders o 
            LEFT JOIN order_types ot ON o.order_type_id = ot.id 
            LEFT JOIN order_statuses os ON o.status_id = os.id 
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id 
            
            UNION ALL

            SELECT to_ord.id, to_ord.total_price, to_ord.created_at, 'TAKEAWAY' as type_name, to_ord.order_status as status_name,
                   'takeaway_orders' as source_table, to_ord.phone, to_ord.customer_name, to_ord.needed_time,
                   to_ord.items as items,
                   to_ord.payment_status as payment_status, to_ord.payment_method as payment_method_name, NULL as order_type,
                   NULL as slip_image
            FROM takeaway_orders to_ord

            UNION ALL

            SELECT do.id, do.total_price, do.created_at, 'DELIVERY' as type_name, do.order_status as status_name,
                   'delivery_orders' as source_table, do.phone, do.customer_name, do.needed_time,
                   do.items as items,
                   do.payment_status as payment_status, do.payment_method as payment_method_name, do.order_type as order_type,
                   NULL as slip_image
            FROM delivery_orders do
            WHERE do.order_status != 'Closed'
            
            ORDER BY created_at DESC
        `);
        
        const parsedOrders = orders.map(o => {
            let parsedItems = [];
            try {
                parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            } catch (e) {
                console.error('Invalid items JSON for order:', o.id);
            }
            return {
                ...o,
                items: parsedItems
            };
        });
        
        res.json({ orders: parsedOrders });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// --- RESERVATIONS ---
export const createReservation = async (req, res) => {
    try {
        const { table_id, customer_name, phone, guests, date, time, notes } = req.body;
        
        await pool.query(
            `INSERT INTO reservations (table_id, customer_name, mobile_number, guest_count, reservation_date, reservation_time, special_requests, reservation_status, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'pending')`,
            [table_id, customer_name, phone, guests, date, time, notes]
        );

        // Update table status
        await pool.query("UPDATE restaurant_tables SET status = 'reserved' WHERE id = ?", [table_id]);

        res.status(201).json({ success: true, message: "Table reserved successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create reservation" });
    }
};

export const getReservations = async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT r.*, rt.table_number 
            FROM reservations r
            LEFT JOIN restaurant_tables rt ON r.table_id = rt.id
        `;
        const params = [];

        if (date) {
            query += " WHERE r.reservation_date = ? ";
            params.push(date);
        }

        query += " ORDER BY r.reservation_date, r.reservation_time";

        const [rows] = await pool.query(query, params);
        res.json({ reservations: rows });
    } catch (err) {
        console.error('Get reservations error:', err);
        res.status(500).json({ message: "Failed to fetch reservations" });
    }
};

// --- BOOKINGS ---
export const createBooking = async (req, res) => {
    try {
        const { customer_name, phone, guests, table_id, date, time, notes } = req.body;
        
        await pool.query(
            `INSERT INTO bookings (customer_name, phone, guests, table_id, date, time, notes, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
            [customer_name, phone, guests, table_id || null, date, time, notes]
        );

        res.status(201).json({ success: true, message: "Booking created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create booking" });
    }
};

export const getBookings = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM bookings ORDER BY date, time");
        res.json({ bookings: rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch bookings" });
    }
};

// --- SETTLEMENT & BILLING ---

export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const [orders] = await pool.query(`
            SELECT o.*, ot.name as type_name, os.name as status_name, rt.table_number
            FROM orders o
            JOIN order_types ot ON o.order_type_id = ot.id
            JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            WHERE o.id = ?
        `, [id]);

        if (orders.length === 0) return res.status(404).json({ message: "Order not found" });

        const [items] = await pool.query(`
            SELECT oi.*, mi.name, mi.price as unit_price 
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.order_id = ?
        `, [id]);

        res.json({ order: orders[0], items });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch order details" });
    }
};

export const getPaymentMethods = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM payment_methods");
        res.json({ methods: rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch payment methods" });
    }
};

export const settleOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { payment_method_id, email } = req.body;

        // 1. Fetch order details for validation
        const [orderRows] = await connection.query(
            "SELECT o.table_id, o.total_price, o.customer_name, o.customer_id, os.name as status_name FROM orders o JOIN order_statuses os ON o.status_id = os.id WHERE o.id = ?", 
            [id]
        );
        
        if (orderRows.length === 0) throw new Error("Order not found");
        const order = orderRows[0];

        // REQUIREMENT: Payment allowed ONLY IF order is fully served
        if (order.status_name !== 'SERVED' && order.status_name !== 'COMPLETED') {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: "Payment restricted: Order must be fully SERVED by steward before settlement." 
            });
        }

        const [statusRows] = await connection.query("SELECT id FROM order_statuses WHERE name = ?", ['COMPLETED']);
        const completedStatusId = statusRows[0].id;

        // 2. Update order status and payment
        const [resUpdate] = await connection.query(
            "UPDATE orders SET status_id = ?, payment_method_id = ?, paid_at = NOW(), main_status = 'COMPLETED' WHERE id = ?",
            [completedStatusId, payment_method_id, id]
        );

        if (resUpdate.affectedRows === 0) throw new Error("Order not found or already settled");

        // 3. Set table status to 'cleaning' with a 5-minute delay (Requirement #3)
        if (order.table_id) {
            await connection.query("UPDATE restaurant_tables SET status = 'cleaning' WHERE id = ?", [order.table_id]);
            
            // Broadcast the 'cleaning' status immediately
            if (global.io) {
                global.io.emit('tableUpdate', { tableId: order.table_id, status: 'cleaning' });
                // Requirement: Notify COMPLETED status across all dashboards
                global.io.emit('orderUpdate', { 
                    orderId: parseInt(id), 
                    status: 'COMPLETED',
                    mainStatus: 'COMPLETED',
                    tableId: order.table_id 
                });
            }

            // Auto-reset to 'available' after 5 minutes
            setTimeout(async () => {
                try {
                    await pool.query("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [order.table_id]);
                    if (global.io) global.io.emit('tableUpdate', { tableId: order.table_id, status: 'available' });
                    console.log(`[Table] Table #${order.table_id} auto-reset to available after 5m cleaning.`);
                } catch (e) {
                    console.error("Delayed table reset failed:", e);
                }
            }, 5 * 60 * 1000); 
        }

        // 4. Grant Loyalty Points if registered customer
        if (order.customer_id) {
            const totalPrice = order.total_price || 0;
            // Basic: 1 pt per 100
            let pointsEarned = Math.floor(totalPrice / 100);
            
            // Item-based Bonus Points
            const [bonusRows] = await connection.query(`
                SELECT SUM(mi.bonus_points * oi.quantity) as bonus
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = ?
            `, [id]);
            
            const itemBonus = parseInt(bonusRows[0]?.bonus || 0);
            pointsEarned += itemBonus;

            if (pointsEarned > 0) {
                await connection.query(
                    'UPDATE online_customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
                    [pointsEarned, order.customer_id]
                );
                console.log(`[Loyalty] Granted ${pointsEarned} points (Basic: ${Math.floor(totalPrice/100)}, Item Bonus: ${itemBonus}) to CUSTOMER#${order.customer_id}`);

                // --- MILESTONE REWARD GENERATION ---
                // If they reach milestones (5th, 10th, 20th order), grant special coupons
                const [orderCountRows] = await connection.query(
                    "SELECT COUNT(*) as count FROM orders WHERE customer_id = ?",
                    [order.customer_id]
                );
                const count = orderCountRows[0].count;
                
                if ([5, 10, 20, 50].includes(count)) {
                    const couponCode = `MIL-${count}-` + Math.random().toString(36).substring(2, 6).toUpperCase();
                    // Just take the first reward for now as a gift
                    const [defRows] = await connection.query('SELECT id FROM loyalty_reward_definitions LIMIT 1');
                    if (defRows.length > 0) {
                        await connection.query(
                            'INSERT INTO customer_rewards (customer_id, reward_id, coupon_code, expiry_date) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY))',
                            [order.customer_id, defRows[0].id, couponCode]
                        );
                        console.log(`[Reward] Auto-generated MIL-${count} reward for CUSTOMER#${order.customer_id}`);
                    }
                }
            }
        }

        await connection.commit();

        // 3. Optional: Send Email Bill
        if (email) {
            const [items] = await pool.query(`
                SELECT oi.quantity, mi.name, mi.price 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                WHERE oi.order_id = ?
            `, [id]);

            const itemLines = items.map(i => `${i.name} x ${i.quantity} = Rs. ${i.price * i.quantity}`).join('\n');
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `Bill for Order #${id} - Melissa's Food Court`,
                text: `Thank you for dining with us!\n\nOrder Details:\n${itemLines}\n\nGrand Total: Rs. ${orderRows[0].total_price}\n\nHave a great day!`
            };
            transporter.sendMail(mailOptions).catch(e => console.error("Email failed:", e));
        }

        res.json({ success: true, message: "Order settled successfully" });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: "Settlement failed", error: err.message });
    } finally {
        connection.release();
    }
};
