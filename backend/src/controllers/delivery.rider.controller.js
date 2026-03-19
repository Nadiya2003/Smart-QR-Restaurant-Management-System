import pool from '../config/db.js';
import { io } from '../server.js';

/**
 * GET /api/delivery-rider/summary
 */
export const getSummary = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [[activeDeliveries]] = await pool.query(
            "SELECT COUNT(*) as count FROM delivery_orders WHERE created_by = ? AND status = 'Out for Delivery'",
            [userId]
        );
        const [[pendingOrders]] = await pool.query(
            "SELECT COUNT(*) as count FROM delivery_orders WHERE status = 'Pending'"
        );
        const [[completedDeliveries]] = await pool.query(
            "SELECT COUNT(*) as count FROM delivery_orders WHERE created_by = ? AND status = 'Delivered' AND DATE(created_at) = CURDATE()",
            [userId]
        );
        const [[cancelRequests]] = await pool.query(
            "SELECT COUNT(*) as count FROM cancel_requests WHERE requested_by = ? AND status = 'pending'",
            [userId]
        );

        res.json({
            activeDeliveries: activeDeliveries.count,
            pendingOrders: pendingOrders.count,
            completedDeliveries: completedDeliveries.count,
            cancelRequests: cancelRequests.count
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ message: 'Failed to fetch summary' });
    }
};

/**
 * GET /api/delivery-rider/orders
 */
export const getOrders = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT do.*, 
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', doi.id, 'name', mi.name, 'quantity', doi.quantity, 'notes', doi.notes)
                   ) FROM delivery_order_items doi JOIN menu_items mi ON doi.menu_item_id = mi.id WHERE doi.order_id = do.id) as items
            FROM delivery_orders do
            WHERE do.status NOT IN ('Delivered')
            ORDER BY do.created_at DESC
        `);

        // Parse items if returned as string
        const parsedOrders = orders.map(o => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
        }));

        res.json({ orders: parsedOrders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};

/**
 * POST /api/delivery-rider/orders
 */
export const createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { customer_name, phone, address, latitude, longitude, items, total_price, payment_status } = req.body;
        const riderId = req.user.userId;

        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO delivery_orders (customer_name, phone, address, latitude, longitude, order_type, status, payment_status, total_price, created_by) 
             VALUES (?, ?, ?, ?, ?, 'rider', 'Pending', ?, ?, ?)`,
            [customer_name, phone, address, latitude, longitude, payment_status || 'Unpaid', total_price, riderId]
        );

        const orderId = result.insertId;

        if (items && items.length > 0) {
            const values = items.map(item => [orderId, item.id, item.quantity, item.notes || '']);
            await connection.query(
                "INSERT INTO delivery_order_items (order_id, menu_item_id, quantity, notes) VALUES ?",
                [values]
            );

            // Add to Order Analytics for reports
            for (const item of items) {
                await connection.query(
                    `INSERT INTO order_analytics 
                    (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) 
                    VALUES (?, 'DELIVERY', 'pending', ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        orderId, 
                        payment_status === 'Paid' ? 'ONLINE' : 'CASH', 
                        item.id, 
                        item.name, 
                        item.category || 'General', 
                        item.quantity, 
                        item.price, 
                        item.price * item.quantity
                    ]
                );
            }
        }

        // Notify Admin/Cashier/Kitchen
        await connection.query(
            "INSERT INTO notifications (user_id, role_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
            [0, 1, 'New Delivery Order', `New order #${orderId} created by rider ${customer_name}`, 'delivery_order']
        );

        await connection.commit();
        
        // Real-time emission
        io.emit('new_delivery_order', { orderId, customer_name, total_price });
        
        res.json({ message: 'Delivery order created successfully', orderId });
    } catch (error) {
        await connection.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    } finally {
        connection.release();
    }
};

/**
 * PATCH /api/delivery-rider/orders/:id/status
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const riderId = req.user.userId;

        // If status is 'Out for Delivery', assign to this rider if not already
        let updateQuery = 'UPDATE delivery_orders SET status = ?';
        let params = [status, id];

        if (status === 'Out for Delivery') {
            updateQuery = 'UPDATE delivery_orders SET status = ?, created_by = ? WHERE id = ?';
            params = [status, riderId, id];
        } else if (status === 'Delivered') {
            // Mark as Paid when delivered if it was Cash on Delivery
            updateQuery = "UPDATE delivery_orders SET status = ?, payment_status = 'Paid' WHERE id = ?";
            params = [status, id];
        } else {
            updateQuery = 'UPDATE delivery_orders SET status = ? WHERE id = ?';
            params = [status, id];
        }

        await pool.query(updateQuery, params);

        // Update Order Analytics status
        await pool.query(
            "UPDATE order_analytics SET order_status = ? WHERE order_id = ? AND order_source = 'DELIVERY'",
            [status.toLowerCase(), id]
        );

        // Real-time emission
        io.emit('delivery_order_updated', { orderId: id, status });

        // Notify relevant dashboards (simulated for now, would use Socket.io)
        res.json({ message: `Order status updated to ${status}` });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
};

/**
 * PATCH /api/delivery-rider/orders/:id/items
 * Add new items to an existing delivery order
 */
export const updateOrderItems = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { items, additional_price } = req.body;

        await connection.beginTransaction();

        // 1. Insert new items
        if (items && items.length > 0) {
            const values = items.map(item => [id, item.id, item.quantity, item.notes || '']);
            await connection.query(
                "INSERT INTO delivery_order_items (order_id, menu_item_id, quantity, notes) VALUES ?",
                [values]
            );
        }

        // 2. Update total price
        await connection.query(
            "UPDATE delivery_orders SET total_price = total_price + ? WHERE id = ?",
            [additional_price, id]
        );

        // 3. Add to Order Analytics
        for (const item of items) {
            await connection.query(
                `INSERT INTO order_analytics 
                (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) 
                VALUES (?, 'DELIVERY', 'pending', 'CASH', ?, ?, ?, ?, ?, ?)`,
                [
                    id, 
                    item.id, 
                    item.name, 
                    item.category || 'General', 
                    item.quantity, 
                    item.price, 
                    item.price * item.quantity
                ]
            );
        }

        await connection.commit();
        res.json({ message: 'Items added to order successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Update order items error:', error);
        res.status(500).json({ message: 'Failed to add items to order' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * POST /api/delivery-rider/orders/:id/cancel-request
 */
export const requestCancel = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const riderId = req.user.userId;

        await pool.query(
            "INSERT INTO cancel_requests (order_id, requested_by, reason, status, order_type) VALUES (?, ?, ?, 'pending', 'delivery')",
            [id, riderId, reason]
        );

        // Notify Admin
        await pool.query(
            "INSERT INTO notifications (user_id, role_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
            [0, 1, 'Delivery Cancellation Request', `Rider requested cancellation for Order #${id}. Reason: ${reason}`, 'cancellation']
        );

        io.emit('delivery_cancel_request', { orderId: id, riderId, reason });

        res.json({ message: 'Cancellation request sent to admin' });
    } catch (error) {
        console.error('Cancel request error:', error);
        res.status(500).json({ message: 'Failed to send cancellation request' });
    }
};

/**
 * GET /api/delivery-rider/history
 */
export const getHistory = async (req, res) => {
    try {
        const riderId = req.user.userId;
        const { dateFrom, dateTo } = req.query;

        let query = "SELECT * FROM delivery_orders WHERE created_by = ? AND status = 'Delivered'";
        let params = [riderId];

        if (dateFrom && dateTo) {
            query += " AND DATE(created_at) BETWEEN ? AND ?";
            params.push(dateFrom, dateTo);
        }

        query += " ORDER BY created_at DESC";

        const [history] = await pool.query(query, params);
        res.json({ history });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ message: 'Failed to fetch history' });
    }
};

/**
 * Duty Management
 */
export const checkIn = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        const [staff] = await connection.query(
            "SELECT full_name FROM staff_users WHERE id = ?",
            [userId]
        );
        const name = staff[0]?.full_name || 'Rider';

        await connection.beginTransaction();

        // 1. Mark as available (Upsert record)
        const [riders] = await connection.query("SELECT id FROM delivery_riders WHERE staff_id = ?", [userId]);
        if (riders.length === 0) {
            await connection.query(
                "INSERT INTO delivery_riders (staff_id, is_available) VALUES (?, 1)",
                [userId]
            );
        } else {
            await connection.query(
                "UPDATE delivery_riders SET is_available = 1 WHERE staff_id = ?",
                [userId]
            );
        }

        // 2. Attendance (using staff_attendance table used by stewards)
        const [existing] = await connection.query(
            "SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?",
            [userId, today]
        );

        if (existing.length === 0) {
            await connection.query(
                "INSERT INTO staff_attendance (staff_id, name, role, date, check_in_time, status) VALUES (?, ?, 'DELIVERY_RIDER', ?, NOW(), 'PRESENT')",
                [userId, name, today]
            );
        } else {
            await connection.query(
                "UPDATE staff_attendance SET check_out_time = NULL, status = 'PRESENT' WHERE id = ?",
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

export const checkOut = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        await connection.beginTransaction();

        // 1. Mark as unavailable
        await connection.query("UPDATE delivery_riders SET is_available = 0 WHERE staff_id = ?", [userId]);

        // 2. Update attendance
        await connection.query(
            "UPDATE staff_attendance SET check_out_time = NOW() WHERE staff_id = ? AND date = ? AND check_out_time IS NULL",
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
 * GET /api/delivery-rider/notifications
 */
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [notifications] = await pool.query(
            "SELECT * FROM notifications WHERE role_id = 6 OR user_id = ? ORDER BY created_at DESC LIMIT 20",
            [userId]
        );
        res.json({ notifications: notifications || [] });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

export const getDutyStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await pool.query('SELECT is_available FROM delivery_riders WHERE staff_id = ?', [userId]);
        const onDuty = rows.length > 0 ? rows[0].is_available === 1 : false;
        res.json({ onDuty });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch duty status' });
    }
};
