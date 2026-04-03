import pool from '../config/db.js';

export const getOrders = async (req, res) => {
    try {
        const { role, subRole } = req.staff;
        const { type, status } = req.query;

        let query = `
            SELECT o.id, o.created_at, o.customer_id, o.steward_id,
                   ot.name as type, 
                   os.name as status,
                   pm.name as payment_method,
                   IF(o.paid_at IS NOT NULL, 'PAID', 'UNPAID') as payment_status,
                   (SELECT COALESCE(SUM(param_oi.price * param_oi.quantity), 0) FROM order_items param_oi WHERE param_oi.order_id = o.id) as total,
                   c.name as customer_name,
                   c.email as customer_email,
                   su.full_name as steward_name
            FROM orders o
            JOIN order_types ot ON o.order_type_id = ot.id
            JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN staff_users su ON o.steward_id = su.id
            WHERE 1=1
        `;

        const params = [];

        if (type && type !== 'all') {
            query += ' AND ot.name = ?';
            params.push(type.toUpperCase());
        }

        if (status && status !== 'all') {
            query += ' AND os.name = ?';
            params.push(status.toUpperCase());
        }

        if (subRole === 'rider' || subRole === 'delivery_rider') {
            query += ' AND ot.name = ?';
            params.push('DELIVERY');
        }

        query += ' ORDER BY o.created_at DESC LIMIT 100';

        const [orders] = await pool.query(query, params);

        for (let order of orders) {
            const [items] = await pool.query(
                `SELECT oi.*, mi.name, cat.name as category
                 FROM order_items oi
                 JOIN menu_items mi ON oi.menu_item_id = mi.id
                 JOIN categories cat ON mi.category_id = cat.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json({ orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { statusName, status } = req.body;
        const targetStatus = (statusName || status).toUpperCase();

        const [statuses] = await pool.query('SELECT id FROM order_statuses WHERE name = ?', [targetStatus]);
        if (statuses.length === 0) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const statusId = statuses[0].id;

        await pool.query(
            'UPDATE orders SET status_id = ? WHERE id = ?',
            [statusId, orderId]
        );

        // Notify relevant staff based on new status
        const { notifyRoles } = await import('./staff.notification.controller.js');
        if (targetStatus === 'PREPARING') {
            await notifyRoles(['kitchen_staff', 'bar_staff'], 'Order in Preparation', `Order #${orderId} has been sent to preparation.`);
        } else if (targetStatus === 'READY') {
            await notifyRoles(['steward', 'delivery_rider'], 'Order Ready', `Order #${orderId} is ready for service/delivery.`);
        }

        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const [orders] = await pool.query(
            `SELECT o.id, o.created_at, o.customer_id, o.steward_id,
                    ot.name as type, 
                    os.name as status,
                    pm.name as payment_method,
                    IF(o.paid_at IS NOT NULL, 'PAID', 'UNPAID') as payment_status,
                    (SELECT COALESCE(SUM(param_oi.price * param_oi.quantity), 0) FROM order_items param_oi WHERE param_oi.order_id = o.id) as total,
                    c.name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    su.full_name as steward_name
             FROM orders o
             JOIN order_types ot ON o.order_type_id = ot.id
             JOIN order_statuses os ON o.status_id = os.id
             LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
             LEFT JOIN customers c ON o.customer_id = c.id
             LEFT JOIN staff_users su ON o.steward_id = su.id
             WHERE o.id = ?`,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        const [items] = await pool.query(
            `SELECT oi.*, mi.name, cat.name as category 
             FROM order_items oi
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             JOIN categories cat ON mi.category_id = cat.id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        order.items = items;

        res.json({ order });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({ message: 'Failed to fetch order details' });
    }
};
