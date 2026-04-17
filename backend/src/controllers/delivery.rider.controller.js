import pool from '../config/db.js';
import { io } from '../server.js';

/**
 * GET /api/delivery-rider/summary
 */
export const getSummary = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [[activeDeliveries]] = await pool.query(
            "SELECT COUNT(*) as count FROM delivery_orders WHERE created_by = ? AND order_status IN ('Accepted', 'Picked Up', 'On the Way')",
            [userId]
        );
        const [[pendingOrders]] = await pool.query(
            "SELECT COUNT(*) as count FROM delivery_orders WHERE order_status = 'Pending'"
        );
        const [[completedDeliveries]] = await pool.query(
            "SELECT COUNT(*) as count FROM delivery_orders WHERE created_by = ? AND order_status = 'Delivered' AND DATE(created_at) = CURDATE()",
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
        const userId = req.user.userId;
        const [orders] = await pool.query(`
            SELECT do.*, 
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', doi.id, 'name', mi.name, 'quantity', doi.quantity, 'notes', doi.notes)
                   ) FROM delivery_order_items doi JOIN menu_items mi ON doi.menu_item_id = mi.id WHERE doi.order_id = do.id) as items_detailed
            FROM delivery_orders do
            WHERE (do.order_status = 'Pending' OR do.created_by = ?)
              AND do.order_status NOT IN ('Pending Final Closure', 'Closed', 'Cancelled')
            ORDER BY do.created_at DESC
        `, [userId]);

        // Parse items if returned as string
        const parsedOrders = orders.map(o => {
            let parsedItems = [];
            try {
                // Use items_detailed if available, otherwise fallback to JSON column 'items'
                parsedItems = typeof o.items_detailed === 'string' ? JSON.parse(o.items_detailed) : (o.items_detailed || []);
                if (parsedItems.length === 0 && o.items) {
                    parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                }
            } catch (e) {
                console.error('Invalid items JSON for order:', o.id);
            }
            return {
                ...o,
                items: parsedItems
            };
        });

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
        const itemsJson = items ? JSON.stringify(items) : null;

        const [result] = await connection.query(
            `INSERT INTO delivery_orders (customer_name, phone, address, latitude, longitude, order_type, order_status, payment_status, total_price, created_by, customer_id, items) 
             VALUES (?, ?, ?, ?, ?, 'rider', 'Pending', ?, ?, ?, ?, ?)`,
            [customer_name, phone, address, latitude, longitude, payment_status || 'pending', total_price, riderId, null, itemsJson]
        );

        const orderId = result.insertId;

        if (items && items.length > 0) {
            const values = items.map(item => [orderId, item.id, item.quantity, item.notes || '']);
            await connection.query(
                "INSERT INTO delivery_order_items (order_id, menu_item_id, quantity, notes) VALUES ?",
                [values]
            );

            // Add to Order Analytics for reports
            const analyticsMethod = payment_status === 'Paid' ? 'ONLINE' : 'CASH';
            for (const item of items) {
                const buyPrice = Number(item.buying_price) || 0;
                const sellPrice = Number(item.price) || 0;
                const qty = Number(item.quantity) || 1;
                const profit = (sellPrice - buyPrice) * qty;

                await connection.query(
                    `INSERT INTO order_analytics 
                    (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price, buying_price, profit) 
                    VALUES (?, 'DELIVERY', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        orderId, 
                        analyticsMethod, 
                        item.id, 
                        item.name, 
                        item.category || 'General', 
                        qty, 
                        sellPrice, 
                        sellPrice * qty,
                        buyPrice,
                        profit
                    ]
                );
            }
        }

        // Notify Admin/Cashier (Role ID 1)
        // Set user_id to NULL to avoid foreign key issues with ID 0
        await connection.query(
            "INSERT INTO notifications (user_id, role_id, title, message, type, target_audience) VALUES (?, ?, ?, ?, ?, ?)",
            [null, 1, 'New Delivery Order', `New order #${orderId} created by rider ${customer_name}`, 'ORDER', 'Staff']
        );

        await connection.commit();
        
        // Real-time emission to all dashboards
        if (global.io) {
            global.io.emit('newOrder', {
                orderId: orderId,
                type: 'DELIVERY',
                customerName: customer_name,
                totalPrice: total_price,
                items: items
            });
        }
        
        res.json({ 
            success: true,
            message: 'Delivery order created successfully', 
            orderId: orderId 
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Create delivery order error:', error);
        res.status(500).json({ 
            message: 'Failed to create order', 
            error: error.message 
        });
    } finally {
        if (connection) connection.release();
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

        // 1. Get current order state
        const [[order]] = await pool.query(
            "SELECT order_status, payment_status, payment_method FROM delivery_orders WHERE id = ?",
            [id]
        );

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const statusSequence = ['Pending', 'Accepted', 'Picked Up', 'On the Way', 'Delivered'];
        const currentIndex = statusSequence.indexOf(order.order_status);
        const nextIndex = statusSequence.indexOf(status);

        // Validate sequence
        if (nextIndex !== -1 && currentIndex !== -1) {
            if (nextIndex < currentIndex) {
                return res.status(400).json({ message: 'Cannot go back to previous status' });
            }
            if (nextIndex > currentIndex + 1) {
                return res.status(400).json({ message: 'Cannot skip status steps' });
            }
        }

        // Validate payment before delivering
        // Allowed to deliver if payment is 'Paid' or 'Pending Settlement'
        const isNotPaid = !['Paid', 'Pending Settlement', 'Completed'].includes(order.payment_status);
        if (status === 'Delivered' && isNotPaid && order.payment_method !== 'online') {
            return res.status(402).json({ 
                message: 'Cannot mark as Delivered while payment is still Pending. Please collect payment first.' 
            });
        }

        // Update queries
        let updateQuery = 'UPDATE delivery_orders SET order_status = ?, delivery_status = ? WHERE id = ?';
        let params = [status, status, id];

        // Specific behavior for "Complete Delivery" (status 'Delivered')
        if (status === 'Delivered') {
            updateQuery = 'UPDATE delivery_orders SET order_status = ?, delivery_status = ? WHERE id = ?';
            params = ['Pending Final Closure', 'Delivered', id];
        } else if (status === 'Accepted' || status === 'Picked Up') {
            updateQuery = 'UPDATE delivery_orders SET order_status = ?, delivery_status = ?, created_by = ? WHERE id = ?';
            params = [status, status, riderId, id];
        }

        await pool.query(updateQuery, params);

        // Update Order Analytics
        await pool.query(
            "UPDATE order_analytics SET order_status = ? WHERE order_id = ? AND order_source = 'DELIVERY'",
            [status.toLowerCase(), id]
        );

        // Real-time emission
        const io = req.app.get('io') || global.io;
        if (io) {
            io.emit('delivery_order_updated', { orderId: id, status, payment_status: order.payment_status });
            io.emit('orderUpdate', { id: parseInt(id), status: status.toUpperCase(), type: 'DELIVERY' });
        }

        res.json({ message: `Order status updated to ${status}`, status });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
};

export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, method } = req.body; 

        // Map status to ensure consistency with requirements
        // payment_status: "Unpaid" | "Paid" | "Pending Settlement" | "Completed"
        await pool.query(
            "UPDATE delivery_orders SET payment_status = ?, payment_method = ? WHERE id = ?",
            [status, method, id]
        );

        const io = req.app.get('io') || global.io;
        if (io) {
            io.emit('delivery_payment_updated', { orderId: id, payment_status: status, payment_method: method });
            io.emit('orderUpdate', { id: parseInt(id), payment_status: status, type: 'DELIVERY' });
        }

        res.json({ message: `Payment status updated to ${status}`, payment_status: status });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ message: 'Failed to update payment status' });
    }
};

/**
 * PATCH /api/delivery-rider/orders/:id/close
 * Final closure by Admin/Manager/Cashier
 */
export const closeOrder = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ensure only Admin, Manager, or Cashier can call this
        if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden. Only staff can close orders.' });
        }

        // Update delivery_orders
        await pool.query(
            "UPDATE delivery_orders SET order_status = 'Closed', payment_status = 'Completed' WHERE id = ?",
            [id]
        );

        // Update order_analytics
        await pool.query(
            "UPDATE order_analytics SET order_status = 'closed' WHERE order_id = ? AND order_source = 'DELIVERY'",
            [id]
        );

        const io = req.app.get('io') || global.io;
        if (io) {
            io.emit('order_closed', { orderId: id, type: 'DELIVERY' });
            io.emit('orderUpdate', { id: parseInt(id), status: 'CLOSED', type: 'DELIVERY' });
        }

        res.json({ message: 'Order closed successfully' });
    } catch (error) {
        console.error('Close order error:', error);
        res.status(500).json({ message: 'Failed to close order' });
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

        let baseQuery = `
            SELECT do.*,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', doi.id, 'name', mi.name, 'quantity', doi.quantity, 'notes', doi.notes, 'price', mi.price)
                   ) FROM delivery_order_items doi 
                    JOIN menu_items mi ON doi.menu_item_id = mi.id 
                    WHERE doi.order_id = do.id) as items_detailed
            FROM delivery_orders do
            WHERE do.created_by = ? 
              AND do.order_status IN ('Delivered', 'Pending Final Closure', 'Closed', 'Cancelled')
        `;
        let params = [riderId];

        if (dateFrom && dateTo) {
            baseQuery += " AND DATE(do.created_at) BETWEEN ? AND ?";
            params.push(dateFrom, dateTo);
        }

        baseQuery += " ORDER BY do.created_at DESC";

        const [rawHistory] = await pool.query(baseQuery, params);
        const history = rawHistory.map(o => {
            let parsedItems = [];
            try {
                parsedItems = typeof o.items_detailed === 'string' ? JSON.parse(o.items_detailed) : (o.items_detailed || []);
                if (parsedItems.length === 0 && o.items) {
                    parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                }
            } catch (e) {
                console.error('Invalid items JSON for order:', o.id);
            }
            return {
                ...o,
                items: parsedItems
            };
        });
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
