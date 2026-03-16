import pool from '../config/db.js';

/**
 * Handle Delivery Order Creation
 */
export const createDeliveryOrder = async (req, res) => {
    try {
        const { customer_id, customer_name, phone, address, items, total_price, notes, payment_status, transaction_id } = req.body;

        if (payment_status !== 'paid') {
            return res.status(400).json({ message: 'Payment failed. Order not saved.' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO delivery_orders 
                (customer_id, customer_name, phone, address, items, total_price, notes, payment_method, payment_status, transaction_id, order_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ONLINE', 'paid', ?, 'pending')`,
                [customer_id || null, customer_name, phone, address, JSON.stringify(items), total_price, notes || '', transaction_id]
            );

            // Loyalty Points Logic: 1 point per Rs. 100
            if (customer_id) {
                const pointsEarned = Math.floor(total_price / 100);
                await connection.query(
                    'UPDATE online_customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
                    [pointsEarned, customer_id]
                );
            }

            // Order Analytics Insertion
            if (Array.isArray(items)) {
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO order_analytics 
                        (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) 
                        VALUES (?, 'DELIVERY', 'pending', 'ONLINE', ?, ?, ?, ?, ?, ?)`,
                        [result.insertId, item.id || 0, item.name, item.category || 'General', item.quantity || 1, item.price || 0, (item.price || 0) * (item.quantity || 1)]
                    );
                }
            }

            await connection.commit();
            res.status(201).json({ 
                message: '✅ Payment Successful! Your order has been placed successfully.', 
                orderId: result.insertId 
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Create delivery order error:', error);
        res.status(500).json({ message: '❌ Checkout Failed. Please try again.', error: error.message });
    }
};

export const createTakeawayOrder = async (req, res) => {
    try {
        const { customer_id, customer_name, phone, pickup_time, items, total_price, notes, payment_status, transaction_id } = req.body;

        if (payment_status !== 'paid') {
            return res.status(400).json({ message: 'Payment failed. Order not saved.' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                `INSERT INTO takeaway_orders 
                (customer_id, customer_name, phone, pickup_time, items, total_price, notes, payment_method, payment_status, transaction_id, order_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ONLINE', 'paid', ?, 'pending')`,
                [customer_id || null, customer_name, phone, pickup_time, JSON.stringify(items), total_price, notes || '', transaction_id]
            );

            // Loyalty Points Logic
            if (customer_id) {
                const pointsEarned = Math.floor(total_price / 100);
                await connection.query(
                    'UPDATE online_customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
                    [pointsEarned, customer_id]
                );
            }

            // Order Analytics Insertion
            if (Array.isArray(items)) {
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO order_analytics 
                        (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) 
                        VALUES (?, 'TAKEAWAY', 'pending', 'ONLINE', ?, ?, ?, ?, ?, ?)`,
                        [result.insertId, item.id || 0, item.name, item.category || 'General', item.quantity || 1, item.price || 0, (item.price || 0) * (item.quantity || 1)]
                    );
                }
            }

            await connection.commit();
            res.status(201).json({ 
                message: '✅ Payment Successful! Your order has been placed successfully.', 
                orderId: result.insertId 
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Create takeaway order error:', error);
        res.status(500).json({ message: '❌ Checkout Failed. Please try again.', error: error.message });
    }
};

/**
 * Get Customer Orders (Updated to pull from both tables)
 */
export const getCustomerOrders = async (req, res) => {
    try {
        const customerId = req.user.userId;

        // Fetch Delivery Orders
        const [deliveryOrders] = await pool.query(
            `SELECT *, 
                    UPPER(order_status) as status, 
                    UPPER(payment_status) as payment_status,
                    "DELIVERY" as type 
             FROM delivery_orders 
             WHERE customer_id = ? 
             ORDER BY created_at DESC`,
            [customerId]
        );

        // Fetch Takeaway Orders
        const [takeawayOrders] = await pool.query(
            `SELECT *, 
                    UPPER(order_status) as status, 
                    UPPER(payment_status) as payment_status,
                    "TAKEAWAY" as type 
             FROM takeaway_orders 
             WHERE customer_id = ? 
             ORDER BY created_at DESC`,
            [customerId]
        );

        // Fetch Dine-in Orders (Joining with status tables)
        const [dineInOrders] = await pool.query(
            `SELECT o.*, 
                    os.name as status,
                    ps.name as payment_status,
                    (SELECT SUM(total_price) FROM order_analytics WHERE order_id = o.id AND order_source = 'DINE-IN') as total_price,
                    "DINE-IN" as type 
             FROM orders o 
             LEFT JOIN order_statuses os ON o.status_id = os.id
             LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.id
             WHERE o.customer_id = ? 
             ORDER BY o.created_at DESC`,
            [customerId]
        );

        const allOrders = [...deliveryOrders, ...takeawayOrders, ...dineInOrders].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json({ orders: allOrders });
    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};

export const cancelDeliveryOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const customerId = req.user.userId;

        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM delivery_orders WHERE id = ? AND customer_id = ?',
            [id, customerId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        if (rows[0].order_status === 'CANCELLED') {
            await connection.rollback();
            return res.status(400).json({ message: 'Order already cancelled' });
        }

        const statusNotes = reason ? `Cancelled: ${reason}` : 'Cancelled by user';
        await connection.query('UPDATE delivery_orders SET order_status = "CANCELLED", status_notes = ? WHERE id = ?', [statusNotes, id]);
        await connection.query(
            'INSERT INTO cancel_deliveries (customer_id, order_id, cancellation_reason) VALUES (?, ?, ?)',
            [customerId, id, reason || 'User requested cancellation']
        );

        await connection.commit();
        res.json({ message: '✅ Order cancelled successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Cancel delivery error:', error);
        res.status(500).json({ message: 'Failed to cancel order' });
    } finally {
        connection.release();
    }
};

export const cancelTakeawayOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const customerId = req.user.userId;

        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM takeaway_orders WHERE id = ? AND customer_id = ?',
            [id, customerId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        if (rows[0].order_status === 'CANCELLED') {
            await connection.rollback();
            return res.status(400).json({ message: 'Order already cancelled' });
        }

        const statusNotes = reason ? `Cancelled: ${reason}` : 'Cancelled by user';
        await connection.query('UPDATE takeaway_orders SET order_status = "CANCELLED", status_notes = ? WHERE id = ?', [statusNotes, id]);
        await connection.query(
            'INSERT INTO cancel_takeaways (customer_id, order_id, cancellation_reason) VALUES (?, ?, ?)',
            [customerId, id, reason || 'User requested cancellation']
        );

        await connection.commit();
        res.json({ message: '✅ Order cancelled successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Cancel takeaway error:', error);
        res.status(500).json({ message: 'Failed to cancel order' });
    } finally {
        connection.release();
    }
};

/**
 * Handle Dine-in Order Creation (QR Scan)
 */
export const createDineInOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { table_number, steward_id, items, total_price, notes } = req.body;
        const customer_id = req.user ? req.user.userId : null;

        await connection.beginTransaction();

        // 1. Get status id for 'PENDING'
        const [statusRows] = await connection.query('SELECT id FROM order_statuses WHERE name = "PENDING"');
        const statusId = statusRows[0]?.id || 1;

        // 2. Get table id from table number
        const [tableRows] = await connection.query('SELECT id FROM restaurant_tables WHERE table_number = ?', [table_number]);
        const tableId = tableRows[0]?.id || null;

        // 3. Insert into orders table
        // Note: orders table doesn't have total_amount or notes, but we can store notes in order_analytics if needed
        // Or we could add them to orders table. For now, let's stick to current schema.
        const [result] = await connection.query(
            `INSERT INTO orders (customer_id, table_id, steward_id, status_id, order_type_id) 
             VALUES (?, ?, ?, ?, 1)`,
            [customer_id, tableId, steward_id || null, statusId]
        );

        // 4. Insert into order_analytics for tracking items
        if (Array.isArray(items)) {
            for (const item of items) {
                const menuItem = item.menuItem || item;
                await connection.query(
                    `INSERT INTO order_analytics 
                    (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) 
                    VALUES (?, 'DINE-IN', 'pending', 'CASH', ?, ?, ?, ?, ?, ?)`,
                    [
                        result.insertId, 
                        menuItem.id || 0, 
                        menuItem.name, 
                        menuItem.category_name || menuItem.category || 'General', 
                        item.quantity || 1, 
                        menuItem.price || 0, 
                        (menuItem.price || 0) * (item.quantity || 1)
                    ]
                );
            }
        }

        // 5. Update table status to 'occupied'
        if (tableId) {
            await connection.query('UPDATE restaurant_tables SET status = "occupied" WHERE id = ?', [tableId]);
        }

        await connection.commit();
        res.status(201).json({ 
            message: '✅ Order placed successfully! Your steward will be with you shortly.', 
            orderId: result.insertId 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create dine-in order error:', error);
        res.status(500).json({ message: '❌ Checkout Failed. Please try again.', error: error.message });
    } finally {
        connection.release();
    }
};

