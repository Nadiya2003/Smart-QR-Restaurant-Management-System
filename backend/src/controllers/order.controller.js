import pool from '../config/db.js';

export const createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { customerId, stewardId, orderType, paymentMethod, total, items } = req.body;

        console.log('📦 Creating order:', { customerId, stewardId, orderType, paymentMethod, total });

        // 1. Get Order Type ID
        const reqOrderType = orderType ? orderType.toUpperCase() : 'DINE_IN';
        const [types] = await connection.query('SELECT id FROM order_types WHERE name = ?', [reqOrderType]);
        if (types.length === 0) throw new Error(`Invalid order type: ${reqOrderType}`);
        const orderTypeId = types[0].id;

        // 2. Get Payment Method ID
        let reqPaymentMethod = paymentMethod ? paymentMethod.toLowerCase() : 'cash';
        let dbPaymentMethodName = 'CASH';

        if (reqPaymentMethod === 'online' || reqPaymentMethod === 'card') {
            dbPaymentMethodName = reqPaymentMethod.toUpperCase();
        } else if (reqPaymentMethod === 'cod' || reqPaymentMethod === 'cash') {
            dbPaymentMethodName = 'CASH';
        }

        const [methods] = await connection.query('SELECT id FROM payment_methods WHERE name = ?', [dbPaymentMethodName]);
        const paymentMethodId = methods.length > 0 ? methods[0].id : null;

        if (!paymentMethodId) {
            throw new Error(`Invalid payment method: ${paymentMethod}`);
        }

        // 3. Get Initial Status ID (PENDING)
        const [statuses] = await connection.query('SELECT id FROM order_statuses WHERE name = ?', ['PENDING']);
        const statusId = statuses[0].id;

        // 4. Determine Payment Status ID
        let reqPaymentStatusStr = 'PENDING';
        if (dbPaymentMethodName === 'ONLINE') reqPaymentStatusStr = 'PAID';
        else if (dbPaymentMethodName === 'CASH') reqPaymentStatusStr = 'PAY_AT_COUNTER';

        const [payStatuses] = await connection.query('SELECT id FROM payment_statuses WHERE name = ?', [reqPaymentStatusStr]);
        const paymentStatusId = payStatuses.length > 0 ? payStatuses[0].id : null;

        // 5. Insert Order
        const [orderRes] = await connection.query(
            `INSERT INTO orders 
            (customer_id, steward_id, order_type_id, status_id, payment_method_id, payment_status_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [customerId, stewardId || null, orderTypeId, statusId, paymentMethodId, paymentStatusId]
        );

        const orderId = orderRes.insertId;
        console.log('✅ Order created with ID:', orderId);

        // 6. Insert Items and Calculate Total (if we wanted to store it, but we don't need to)
        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                orderId,
                item.id,
                item.quantity,
                item.price
            ]);

            await connection.query(
                `INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ?`,
                [itemValues]
            );
        }

        // 7. Reward Loyalty (Logic remains similar)
        if (reqPaymentStatusStr === 'PAID' && customerId) {
            const pointsToGain = Math.floor(total / 10);
            if (pointsToGain > 0) {
                await connection.query(
                    'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
                    [pointsToGain, customerId]
                );
            }
        }

        await connection.commit();

        // 8. Notify Staff for Takeaway/Delivery
        if (reqOrderType === 'TAKEAWAY' || reqOrderType === 'DELIVERY') {
            const { notifyRoles } = await import('./staff.notification.controller.js');
            await notifyRoles(
                ['admin', 'manager', 'cashier'],
                `New ${reqOrderType} Order`,
                `A new ${reqOrderType.toLowerCase()} order (#${orderId}) has been placed.`,
                'ORDER'
            );
        }

        res.status(201).json({ message: 'Order created', orderId });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Create order error:', error);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    } finally {
        connection.release();
    }
};

export const getCustomerOrders = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📋 Fetching orders for customer ID:', id);

        const [orders] = await pool.query(
            `SELECT o.id, o.created_at,
                    os.name as status,
                    ot.name as order_type,
                    pm.name as payment_method,
                    ps.name as payment_status,
                    COALESCE(SUM(oi.price * oi.quantity), 0) as total_price
             FROM orders o
             JOIN order_statuses os ON o.status_id = os.id
             JOIN order_types ot ON o.order_type_id = ot.id
             LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
             LEFT JOIN payment_statuses ps ON o.payment_status_id = ps.id
             LEFT JOIN order_items oi ON o.id = oi.order_id
             WHERE o.customer_id = ?
             GROUP BY o.id, os.name, ot.name, pm.name, ps.name, o.created_at
             ORDER BY o.created_at DESC`,
            [id]
        );

        console.log(`✅ Found ${orders.length} orders for customer ${id}`);
        res.json({ orders });
    } catch (error) {
        console.error('❌ Get customer orders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};
