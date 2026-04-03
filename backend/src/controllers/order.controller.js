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

            // Notify all dashboards
            if (global.io) {
                global.io.emit('newOrder', {
                    orderId: result.insertId,
                    type: 'DELIVERY',
                    customerName: customer_name,
                    totalPrice: total_price,
                    items: items // Adding items to global broadcast
                });
            }

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

            // Notify all dashboards
            if (global.io) {
                global.io.emit('newOrder', {
                    orderId: result.insertId,
                    type: 'TAKEAWAY',
                    customerName: customer_name,
                    totalPrice: total_price,
                    items: items // Adding items for takeaway
                });
            }

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

        // Fetch Dine-in Orders (Joining with status tables and items)
        const [dineInOrders] = await pool.query(
            `SELECT o.*, 
                    os.name as status,
                    o.paid_at,
                    IF(o.paid_at IS NOT NULL, 'PAID', 'UNPAID') as payment_status,
                    COALESCE(o.total_price, (SELECT SUM(total_price) FROM order_analytics WHERE order_id = o.id AND order_source = 'DINE-IN')) as total_price,
                    pm.name as payment_method_name,
                    rt.table_number,
                    (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)
                    ) FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id) as items,
                    "DINE-IN" as type 
             FROM orders o 
             LEFT JOIN order_statuses os ON o.status_id = os.id
             LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
             LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
             WHERE o.customer_id = ? 
             ORDER BY o.created_at DESC`,
            [customerId]
        );

        // Parse items JSON if returned as string (for Delivery/Takeaway)
        const formatOrders = (orders) => orders.map(o => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
        }));

        const allOrders = [
            ...formatOrders(deliveryOrders), 
            ...formatOrders(takeawayOrders), 
            ...formatOrders(dineInOrders)
        ].sort((a, b) => 
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

        // BUG FIX: Use case-insensitive comparison since DB stores lowercase 'pending' but also 'CANCELLED'
        if ((rows[0].order_status || '').toUpperCase() === 'CANCELLED') {
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

        // BUG FIX: Use case-insensitive comparison since DB stores lowercase 'pending' but also 'CANCELLED'
        if ((rows[0].order_status || '').toUpperCase() === 'CANCELLED') {
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
        const { table_number, steward_id, items, total_price, notes, order_id } = req.body;
        const customer_id = req.user ? req.user.userId : null;

        await connection.beginTransaction();

        // 1. Get status id for 'PENDING'
        const [statusRows] = await connection.query('SELECT id FROM order_statuses WHERE name = "PENDING"');
        const statusId = statusRows[0]?.id || 1;

        // 2. Resolve steward_id (staff_id -> steward_id)
        let resolvedStewardId = steward_id;
        if (steward_id) {
            const [stewardRows] = await connection.query('SELECT id FROM stewards WHERE staff_id = ?', [steward_id]);
            if (stewardRows.length > 0) {
                resolvedStewardId = stewardRows[0].id;
            }
        }

        // 3. Get table id from table number
        const [tableRows] = await connection.query('SELECT id FROM restaurant_tables WHERE table_number = ?', [table_number]);
        const tableId = tableRows[0]?.id || null;

        // 3. Identify Target Order & Update Price if needed
        let targetOrderId = order_id;
        const orderType = customer_id ? 'registered' : 'guest';
        
        // Calculate inclusive total for the NEW items being added
        const baseTotal = Array.isArray(items) 
            ? items.reduce((sum, item) => sum + ((item.menuItem?.price || item.price || 0) * (item.quantity || 1)), 0)
            : total_price;
        const inclusiveNewTotal = baseTotal * 1.15; // 10% SC + 5% Tax

        if (targetOrderId) {
            // If explicit ID provided, update its total and associate with the current steward if not already associated
            console.log(`[DineIn] Updating existing order ${targetOrderId} with additional total: ${inclusiveNewTotal}`);
            await connection.query(
                `UPDATE orders SET 
                 total_price = total_price + ?, 
                 updated_at = CURRENT_TIMESTAMP,
                 steward_id = COALESCE(steward_id, ?) 
                 WHERE id = ?`,
                [inclusiveNewTotal, resolvedStewardId || null, targetOrderId]
            );
        } else if (tableId && customer_id) {
            // Auto-merge logic for registered customers
            const [activeOrderRows] = await connection.query(
                `SELECT o.id FROM orders o 
                 JOIN order_statuses os ON o.status_id = os.id
                 WHERE o.table_id = ? AND o.customer_id = ? AND os.name NOT IN ("COMPLETED", "CANCELLED")
                 ORDER BY o.created_at DESC LIMIT 1`,
                [tableId, customer_id]
            );
            if (activeOrderRows.length > 0) {
                targetOrderId = activeOrderRows[0].id;
                console.log(`[DineIn] Auto-merging to existing order ${targetOrderId} for customer ${customer_id}`);
                await connection.query(
                    'UPDATE orders SET total_price = total_price + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [inclusiveNewTotal, targetOrderId]
                );
            }
        }

        // 4. Create new order if still no target
        if (!targetOrderId) {
            // Requirement #1: Unified Lifecycle - Start at PENDING
            const [statusRows] = await connection.query('SELECT id FROM order_statuses WHERE name = "PENDING"');
            const startStatusId = statusRows[0]?.id || 1;

            const [result] = await connection.query(
                `INSERT INTO orders (customer_id, table_id, steward_id, status_id, order_type_id, order_type, total_price, kitchen_status, bar_status, main_status) 
                 VALUES (?, ?, ?, ?, 1, ?, ?, 'pending', 'pending', 'PENDING')`,
                [customer_id, tableId, resolvedStewardId || null, startStatusId, orderType, inclusiveNewTotal]
            );
            targetOrderId = result.insertId;
        }

        // 4. Insert into order_analytics & order_items
        let fullDetailedItems = [];
        let hasFood = false;
        let hasBeverages = false;

        if (Array.isArray(items)) {
            for (const item of items) {
                const menuItem = item.menuItem || item;
                const catName = (menuItem.category_name || menuItem.category || 'Food').toUpperCase();
                const isBeverage = catName.includes('BEVERAGE') || catName.includes('DRINK') || catName.includes('BAR');

                if (isBeverage) hasBeverages = true;
                else hasFood = true;

                fullDetailedItems.push({
                    name: menuItem.name,
                    quantity: item.quantity || 1,
                    price: menuItem.price || 0,
                    category: catName
                });
                
                // Add to order_analytics (for reports)
                await connection.query(
                    `INSERT INTO order_analytics 
                    (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) 
                    VALUES (?, 'DINE-IN', 'pending', 'CASH', ?, ?, ?, ?, ?, ?)`,
                    [
                        targetOrderId, 
                        menuItem.id || 0, 
                        menuItem.name, 
                        catName, 
                        item.quantity || 1, 
                        menuItem.price || 0, 
                        (menuItem.price || 0) * (item.quantity || 1)
                    ]
                );

                // Add to order_items (for steward view)
                await connection.query(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [targetOrderId, menuItem.id || 0, item.quantity || 1, menuItem.price || 0]
                );
            }
        }

        // 4b. Update split statuses based on item types (Requirement #2)
        if (!hasFood) {
            await connection.query('UPDATE orders SET kitchen_status = "ready" WHERE id = ?', [targetOrderId]);
        }
        if (!hasBeverages) {
            await connection.query('UPDATE orders SET bar_status = "ready" WHERE id = ?', [targetOrderId]);
        }

        // 5. Update table status to 'not available'
        if (tableId) {
            await connection.query('UPDATE restaurant_tables SET status = "not available" WHERE id = ?', [tableId]);
        }

        // Fetch customer name for notification
        let customerName = 'Guest';
        let customerType = 'guest';
        if (customer_id) {
            const [custRows] = await connection.query('SELECT name FROM online_customers WHERE id = ?', [customer_id]);
            if (custRows.length > 0) {
                customerName = custRows[0].name;
                customerType = 'registered';
            }
        }
        const isUpdate = !!order_id; // true if customer added items to an existing order

        await connection.commit();
        
        // Notify all dashboards of table status change (Requirement #5)
        if (global.io && tableId) {
            global.io.emit('tableUpdate', { 
                tableId, 
                tableNumber: tableRows && tableRows.length > 0 ? tableRows[0].table_number : table_number,
                status: 'Occupied',
                type: 'ORDER_PLACED'
            });
        }

        // Emit for Real-time update (Requirement 13)
        if (global.io) {
            global.io.emit('newOrder', { 
                orderId: targetOrderId, 
                type: 'DINE-IN',
                isUpdate,
                stewardId: resolvedStewardId,
                staffId: steward_id,
                tableNumber: table_number,
                customerName,
                customerType,
                totalPrice: inclusiveNewTotal,
                items: fullDetailedItems
            });
            global.io.emit('orderUpdate', { 
                orderId: targetOrderId, 
                type: 'DINE-IN',
                isUpdate,
                stewardId: resolvedStewardId,
                staffId: steward_id,
                tableNumber: table_number,
                customerName,
                customerType,
                status: 'PENDING'
            });
        }

        res.status(201).json({ 
            message: isUpdate ? 'Order item(s) added successfully' : 'Dine-in order placed successfully', 
            orderId: targetOrderId,
            totalPrice: inclusiveNewTotal 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create dine-in order error:', error);
        res.status(500).json({ message: '❌ Checkout Failed. Please try again.', error: error.message });
    } finally {
        connection.release();
    }
};

export const getActiveOrderByTable = async (req, res) => {
    try {
        const { tableNumber } = req.params;
        const [orders] = await pool.query(
            `SELECT o.*, 
                    UPPER(os.name) as status,
                    o.paid_at,
                    IF(o.paid_at IS NOT NULL, 'PAID', 'UNPAID') as payment_status,
                    rt.table_number,
                    pm.name as payment_method_name,
                    (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)
                    ) FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id) as items,
                    "DINE-IN" as type 
             FROM orders o 
             LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
             LEFT JOIN order_statuses os ON o.status_id = os.id
             LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
             WHERE rt.table_number = ? AND os.name NOT IN ('COMPLETED', 'CANCELLED')
             ORDER BY o.created_at DESC LIMIT 1`,
            [tableNumber]
        );

        res.json({ order: orders[0] || null });
    } catch (error) {
        console.error('Get active order error:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
};


export const requestDineInCancellation = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, itemIds } = req.body;

        const customer_id = (req.user && (req.user.userId || req.user.id)) || null;
        
        // 1. Check if order exists
        const [orders] = await pool.query('SELECT o.id, o.status_id, o.cancellation_status, o.table_id, o.customer_id FROM orders o WHERE o.id = ?', [id]);

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        // Ensure authorization: must be the owner, or it must be a guest order that hasn't synced yet
        if (order.customer_id && customer_id && order.customer_id !== customer_id) {
            return res.status(403).json({ message: 'Unauthorized. This order belongs to another user.' });
        }

        // 2. Check current status
        const [statusRows] = await pool.query('SELECT name FROM order_statuses WHERE id = ?', [order.status_id]);
        const statusName = statusRows[0]?.name?.toUpperCase();

        if (['CANCELLED', 'COMPLETED', 'SERVED', 'FINISHED'].includes(statusName)) {
            return res.status(400).json({ message: `Order is already ${statusName}. Cannot cancel now.` });
        }

        // --- DIRECT CANCELLATION FOR EARLY ORDERS ---
        if (['PENDING', 'ACCEPTED', 'RECEIVED', 'ORDER PLACED', 'CONFIRMED'].includes(statusName)) {
            const isPartial = itemIds && Array.isArray(itemIds) && itemIds.length > 0;
            
            if (isPartial) {
                // PARTIAL DIRECT CANCELLATION
                // Delete selected items
                await pool.query('DELETE FROM order_items WHERE order_id = ? AND id IN (?)', [id, itemIds]);
                
                // Recalculate Total
                const [itemRows] = await pool.query('SELECT price, quantity FROM order_items WHERE order_id = ?', [id]);
                if (itemRows.length === 0) {
                   // If no items left, cancel the entire order instead
                   const [statusRows] = await pool.query('SELECT id FROM order_statuses WHERE name = "CANCELLED"');
                   const cancelStatusId = statusRows[0]?.id || 2;
                   await pool.query('UPDATE orders SET status_id = ?, cancellation_status = "CANCELLED" WHERE id = ?', [cancelStatusId, id]);
                   if (order.table_id) {
                       await pool.query('UPDATE restaurant_tables SET status = "cleaning" WHERE id = ?', [order.table_id]);
                       if (global.io) global.io.emit('tableUpdate', { tableId: order.table_id, status: 'cleaning' });
                       
                       setTimeout(async () => {
                           try {
                               await pool.query("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [order.table_id]);
                               if (global.io) global.io.emit('tableUpdate', { tableId: order.table_id, status: 'available' });
                           } catch (e) {}
                       }, 5 * 60 * 1000);
                   }
                } else {
                   const subtotal = itemRows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                   const total = subtotal * 1.15; // 10% SC, 5% Tax
                   await pool.query('UPDATE orders SET total_price = ? WHERE id = ?', [total, id]);
                }
                console.log(`[Cancel] Partial cancellation for Order #${id}: ${itemIds.length} items removed`);
            } else {
                // FULL DIRECT CANCELLATION
                const [cancelStatusRows] = await pool.query('SELECT id FROM order_statuses WHERE name = "CANCELLED"');
                const cancelStatusId = cancelStatusRows[0]?.id || 2;
                
                await pool.query(
                    'UPDATE orders SET status_id = ?, cancellation_status = "CANCELLED", cancellation_reason = ? WHERE id = ?',
                    [cancelStatusId, reason || 'Customer cancelled via App', id]
                );

                if (order.table_id) {
                    await pool.query('UPDATE restaurant_tables SET status = "cleaning" WHERE id = ?', [order.table_id]);
                    if (global.io) global.io.emit('tableUpdate', { tableId: order.table_id, status: 'cleaning' });
                     
                    setTimeout(async () => {
                        try {
                            await pool.query("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [order.table_id]);
                            if (global.io) global.io.emit('tableUpdate', { tableId: order.table_id, status: 'available' });
                            console.log(`[Cancel_Table_Reset] Table #${order.table_id} auto-reset to available after 5m cleaning.`);
                        } catch (e) {}
                    }, 5 * 60 * 1000);
                }
                console.log(`[Cancel] Full direct cancellation for Order #${id}`);
            }

            // Notify Steward
            try {
                const [orderDetails] = await pool.query(`
                    SELECT o.table_id, rt.table_number, o.steward_id, s.staff_id,
                           c.name as customer_name,
                           CASE WHEN o.customer_id IS NOT NULL THEN 'registered' ELSE 'guest' END as customer_type
                    FROM orders o
                    LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
                    LEFT JOIN stewards s ON o.steward_id = s.id
                    LEFT JOIN online_customers c ON o.customer_id = c.id
                    WHERE o.id = ?
                `, [id]);

                if (global.io && orderDetails.length > 0) {
                    const od = orderDetails[0];
                    const isDirect = true;
                    const eventName = isPartial ? 'orderUpdate' : 'orderCancelled';
                    global.io.emit(eventName, {
                        orderId: parseInt(id),
                        tableNumber: od.table_number,
                        staffId: od.staff_id,
                        customerName: od.customer_name || 'Guest',
                        customerType: od.customer_type,
                        reason: reason || (isPartial ? 'Partial items removed' : 'Customer Cancelled'),
                        isDirect: isDirect,
                        playSound: true,
                        isPartial: isPartial
                    });
                }
            } catch (notifErr) {
                console.error('Notify cancellation error:', notifErr);
            }

            return res.json({ success: true, isDirect: true, partial: isPartial, message: isPartial ? '✅ Selected items removed.' : '✅ Order cancelled successfully.' });
        }

        // --- FALLBACK: REQUEST BASED CANCELLATION FOR LATE ORDERS ---
        if (order.cancellation_status === 'PENDING') {
            return res.status(400).json({ message: 'Cancellation request is already pending.' });
        }

        // Insert into cancel_requests for manager review
        await pool.query(
            'INSERT INTO cancel_requests (order_id, requested_by, reason, status, item_ids) VALUES (?, ?, ?, "pending", ?)',
            [id, customer_id || null, reason || 'Customer requested via App', itemIds ? JSON.stringify(itemIds) : null]
        );

        await pool.query(
            'UPDATE orders SET cancellation_status = "PENDING", cancellation_reason = ? WHERE id = ?',
            [reason || 'Not specified', id]
        );

        // Notify steward of the request
        try {
            const [orderDetails] = await pool.query(`
                SELECT o.table_id, rt.table_number, o.steward_id, s.staff_id,
                       c.name as customer_name,
                       CASE WHEN o.customer_id IS NOT NULL THEN 'registered' ELSE 'guest' END as customer_type
                FROM orders o
                LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
                LEFT JOIN stewards s ON o.steward_id = s.id
                LEFT JOIN online_customers c ON o.customer_id = c.id
                WHERE o.id = ?
            `, [id]);

            if (global.io && orderDetails.length > 0) {
                const od = orderDetails[0];
                global.io.emit('cancelRequest', {
                    orderId: parseInt(id),
                    tableNumber: od.table_number,
                    staffId: od.staff_id,
                    customerName: od.customer_name || 'Guest',
                    customerType: od.customer_type,
                    reason: reason || 'Not specified',
                    isDirect: false,
                    playSound: true,
                    isPartial: !!itemIds
                });
            }
        } catch (notifErr) {
            console.error('Cancel request notify error:', notifErr);
        }

        res.json({ success: true, isDirect: false, message: '✅ Cancellation request sent. Steward has been notified.' });
    } catch (error) {
        console.error('Dine-in cancellation handler error:', error);
        res.status(500).json({ message: 'Failed to process cancellation' });
    }
};

/**
 * DELETE /api/orders/:orderId/items/:itemId
 * Remove a single item from an order and update total price
 */
export const removeOrderItem = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { orderId, itemId } = req.params;
        await connection.beginTransaction();

        // 1. Get info about the item being removed
        const [itemRows] = await connection.query(
            "SELECT quantity, price FROM order_items WHERE id = ? AND order_id = ?",
            [itemId, orderId]
        );

        if (itemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Item not found in this order" });
        }

        const { quantity, price } = itemRows[0];
        const baseAmount = price * quantity;
        const inclusiveAmount = baseAmount * 1.15; // Including 10% SC and 5% Tax

        // 2. Delete from order_items
        await connection.query("DELETE FROM order_items WHERE id = ? AND order_id = ?", [itemId, orderId]);
        
        // 3. Update orders total_price
        await connection.query(
            "UPDATE orders SET total_price = GREATEST(0, total_price - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [inclusiveAmount, orderId]
        );

        // 4. Update order_analytics (remove matching record for consistent reporting)
        // Note: This is an approximation since analytics doesn't have oi.id, 
        // but it's consistent with how createDineInOrder inserts them.
        await connection.query(
            "DELETE FROM order_analytics WHERE order_id = ? AND unit_price = ? AND quantity = ? LIMIT 1",
            [orderId, price, quantity]
        );

        await connection.commit();
        
        // Notify dashboards instantly that an item was dropped!
        if (global.io) {
            global.io.emit('orderUpdate', { orderId: parseInt(orderId), action: 'ITEM_REMOVED' });
        }

        res.json({ success: true, message: "Item removed and total price updated" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Remove order item error:", error);
        res.status(500).json({ message: "Failed to remove item" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Get all tables for selection
 */
export const getAllTables = async (req, res) => {
    try {
        const [tables] = await pool.query(`
            SELECT t.*, a.area_name,
                   (SELECT rs.reservation_time 
                    FROM reservations rs 
                    WHERE rs.table_id = t.id 
                    AND rs.status NOT IN ('CANCELLED')
                    AND DATE(rs.reservation_date) = CURDATE()
                    ORDER BY rs.reservation_time ASC LIMIT 1) as reservation_time,
                   (SELECT rs.customer_name 
                    FROM reservations rs 
                    WHERE rs.table_id = t.id 
                    AND rs.status NOT IN ('CANCELLED')
                    AND DATE(rs.reservation_date) = CURDATE()
                    ORDER BY rs.reservation_time ASC LIMIT 1) as reservation_customer,
                   (SELECT os.name 
                    FROM orders o 
                    JOIN order_statuses os ON o.status_id = os.id
                    WHERE o.table_id = t.id 
                    AND os.name NOT IN ('COMPLETED', 'CANCELLED')
                    ORDER BY o.created_at DESC LIMIT 1) as active_order_status,
                   (SELECT su.full_name 
                    FROM orders o 
                    JOIN stewards s ON o.steward_id = s.id 
                    JOIN staff_users su ON s.staff_id = su.id
                    WHERE o.table_id = t.id 
                    AND o.status_id NOT IN (SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED'))
                    ORDER BY o.created_at DESC LIMIT 1) as steward_name
            FROM restaurant_tables t
            JOIN dining_areas a ON t.area_id = a.id
            ORDER BY (CASE WHEN a.area_name = 'Italian Area' THEN 0 ELSE 1 END), a.area_name, t.table_number
        `);
        res.json({ tables });
    } catch (err) {
        console.error('Get all tables error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Update the table for an active order
 */
export const updateOrderTable = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { orderId, newTableNumber } = req.body;
        // const customerId = req.user ? req.user.userId : null;

        await connection.beginTransaction();

        // 1. Get new table id
        const [tableRows] = await connection.query('SELECT id FROM restaurant_tables WHERE table_number = ?', [newTableNumber]);
        if (tableRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Table not found' });
        }
        const newTableId = tableRows[0].id;

        // 2. Get old table id from order
        const [orderRows] = await connection.query('SELECT table_id FROM orders WHERE id = ?', [orderId]);
        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }
        const oldTableId = orderRows[0].table_id;

        // 3. Update order
        await connection.query('UPDATE orders SET table_id = ? WHERE id = ?', [newTableId, orderId]);

        // 4. Update table statuses
        if (oldTableId && oldTableId !== newTableId) {
            // Check if any other active orders are on the old table before freeing it
            const [otherOrders] = await connection.query(
                "SELECT id FROM orders WHERE table_id = ? AND id != ? AND status_id IN (SELECT id FROM order_statuses WHERE name NOT IN ('COMPLETED', 'CANCELLED'))",
                [oldTableId, orderId]
            );
            if (otherOrders.length === 0) {
                await connection.query('UPDATE restaurant_tables SET status = "available" WHERE id = ?', [oldTableId]);
            }
        }
        await connection.query('UPDATE restaurant_tables SET status = "not available" WHERE id = ?', [newTableId]);

        await connection.commit();
        res.json({ message: 'Table updated successfully', tableNumber: newTableNumber });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Update order table error:', err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (connection) connection.release();
    }
};
/**
 * End a dine-in session and free the table (Item 11)
 */
export const endDineInSession = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: 'Order ID required' });

        await connection.beginTransaction();

        // 1. Get the table ID for this order
        const [orderRows] = await connection.query('SELECT table_id, status_id FROM orders WHERE id = ?', [orderId]);
        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }
        const { table_id: tableId, status_id: statusId } = orderRows[0];

        // 2. Resolve status name
        const [statusRows] = await connection.query('SELECT name FROM order_statuses WHERE id = ?', [statusId]);
        const statusName = statusRows[0]?.name;

        // 3. Mark table as available IF no other active orders exist on it
        if (tableId) {
            // Check if any other active orders are on this table
            const [otherOrders] = await connection.query(
                "SELECT id FROM orders WHERE table_id = ? AND id != ? AND status_id IN (SELECT id FROM order_statuses WHERE name NOT IN ('COMPLETED', 'CANCELLED'))",
                [tableId, orderId]
            );
            if (otherOrders.length === 0) {
                await connection.query('UPDATE restaurant_tables SET status = "available" WHERE id = ?', [tableId]);
                console.log(`[SessionEnd] Table ${tableId} freed via session end for order ${orderId}`);
            }
        }

        // 4. Optionally mark order as CANCELLED if it was still PENDING or merely PLACED
        if (['PENDING', 'ORDER PLACED'].includes(statusName?.toUpperCase())) {
            const [cancelledStatus] = await connection.query('SELECT id FROM order_statuses WHERE name = "CANCELLED"');
            if (cancelledStatus.length > 0) {
                await connection.query('UPDATE orders SET status_id = ? WHERE id = ?', [cancelledStatus[0].id, orderId]);
            }
        }

        await connection.commit();

        // Real-time update emit (Requirement 13 & 5)
        if (global.io) {
            global.io.emit('orderUpdate', { orderId, type: 'DINE-IN', status: 'SESSION_ENDED' });
            // Free the table in real-time
            if (order.table_id) {
                global.io.emit('tableUpdate', { 
                    tableId: order.table_id, 
                    status: 'Available',
                    type: 'SESSION_ENDED'
                });
            }
        }

        res.json({ success: true, message: 'Session ended and table freed' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('End dine-in session error:', err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (connection) connection.release();
    }
};

export const syncGuestOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { tableNumber } = req.body;
        const customerId = req.user.userId;

        if (!tableNumber) {
            return res.status(400).json({ message: 'Table number is required for syncing' });
        }

        await connection.beginTransaction();

        // 1. Get the table ID from table number
        const [tableRows] = await connection.query('SELECT id FROM restaurant_tables WHERE table_number = ?', [tableNumber]);
        if (tableRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Table not found' });
        }
        const tableId = tableRows[0].id;

        // 2. Find the most recent active guest order for this table
        const [orderRows] = await connection.query(
            `SELECT id FROM orders 
             WHERE table_id = ? AND customer_id IS NULL AND order_type = 'guest'
             AND status_id NOT IN (SELECT id FROM order_statuses WHERE name IN ('COMPLETED', 'CANCELLED'))
             ORDER BY created_at DESC LIMIT 1`,
            [tableId]
        );

        if (orderRows.length === 0) {
            await connection.rollback();
            return res.json({ message: 'No active guest order found to sync', synced: false });
        }

        const orderId = orderRows[0].id;

        // 3. Update the order with customer ID and change type to 'registered'
        await connection.query(
            "UPDATE orders SET customer_id = ?, order_type = 'registered' WHERE id = ?",
            [customerId, orderId]
        );

        // 4. Update customer_name from user if available
        const [userRows] = await connection.query('SELECT name FROM online_customers WHERE id = ?', [customerId]);
        if (userRows.length > 0) {
            await connection.query('UPDATE orders SET customer_name = ? WHERE id = ?', [userRows[0].name, orderId]);
        }

        await connection.commit();
        res.json({ message: 'Order synced successfully', synced: true, orderId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Sync guest order error:', error);
        res.status(500).json({ message: 'Failed to sync guest order', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Request payment (Cash/Card/Online)
 */
export const requestPayment = async (req, res) => {
    try {
        const { orderId, method, total } = req.body;
        const slip = req.file ? `/uploads/${req.file.filename}` : null;

        if (!orderId) return res.status(400).json({ message: 'Order ID is required' });

        // 1. Get order details for notification
        const [orderDetails] = await pool.query(`
            SELECT o.table_id, rt.table_number, o.steward_id, s.staff_id,
                   o.customer_name, o.customer_id
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            WHERE o.id = ?
        `, [orderId]);

        if (orderDetails.length === 0) return res.status(404).json({ message: 'Order not found' });
        const od = orderDetails[0];

        // 2. Automatically resolve payment and forcefully close the order (Requirement: steward order closed immediately upon customer payment)
        let methodId = 1; // Default Cash
        if (method === 'online') methodId = 3;
        if (method === 'card') methodId = 2;
        
        await pool.query('UPDATE orders SET payment_method_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?', [methodId, orderId]);

        // Instantly flip to COMPLETED
        const [compStatus] = await pool.query('SELECT id, name FROM order_statuses WHERE name = "COMPLETED"');
        if (compStatus.length > 0) {
             await pool.query('UPDATE orders SET status_id = ?, main_status = ? WHERE id = ?', [compStatus[0].id, compStatus[0].name, orderId]);
        }

        // 3. Notify Steward/Cashier via Socket (Requirement 13)
        if (global.io) {
            // Emitting COMPLETED triggers dashboard removals directly
            global.io.emit('orderUpdate', { orderId: parseInt(orderId), status: 'COMPLETED' });
            
            global.io.emit('paymentRequest', {
                orderId: parseInt(orderId),
                tableNumber: od.table_number,
                staffId: od.staff_id, 
                method: method.toUpperCase(),
                total: total,
                slip: slip,
                customerName: od.customer_name || 'Guest',
                playSound: true
            });
            
            // Also notify cashier room
            global.io.to('cashier_room').emit('paymentRequest', {
                orderId: parseInt(orderId),
                tableNumber: od.table_number,
                method: method.toUpperCase(),
                total: total,
                slip: slip,
                playSound: true
            });
        }

        res.json({ success: true, message: 'Payment request sent' });
    } catch (err) {
        console.error('Request payment error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
