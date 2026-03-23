import pool from '../config/db.js';

// --- Staff Management ---
export const getAllStaff = async (req, res) => {
    try {
        const [staff] = await pool.query(
            `SELECT su.id, su.full_name as name, su.email, su.phone,
                    sr.role_name as role, su.is_active, su.created_at, su.permissions,
                    st.image as steward_image,
                    EXISTS(SELECT 1 FROM staff_attendance sa WHERE sa.staff_id = su.id AND sa.date = CURDATE() AND sa.check_out_time IS NULL) as is_available
             FROM staff_users su
             JOIN staff_roles sr ON su.role_id = sr.id
             LEFT JOIN stewards st ON su.id = st.staff_id
             ORDER BY su.created_at DESC`
        );

        const staffWithPermissions = staff.map(s => {
            let permissions = [];
            try {
                permissions = JSON.parse(s.permissions || '[]');
            } catch (e) {
                permissions = s.permissions ? [s.permissions] : [];
            }
            return { 
                ...s, 
                status: s.is_active ? 'active' : 'inactive',
                permissions 
            };
        });

        res.json({ staff: staffWithPermissions });
    } catch (err) {
        console.error('Get all staff error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleStaffStatus = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { status } = req.body; // 'active', 'inactive'

        console.log(`Updating staff ${id} status to: ${status}`);

        // Get staff details before update
        const [staffBefore] = await connection.query(
            'SELECT id, full_name, email, is_active FROM staff_users WHERE id = ?',
            [id]
        );

        if (staffBefore.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Staff member not found' });
        }

        const staffUser = staffBefore[0];
        const newIsActive = status === 'active' ? 1 : 0;

        // Update staff status - Unify status ('active'/'inactive') and is_active (1/0)
        await connection.query(
            'UPDATE staff_users SET is_active = ?, status = ? WHERE id = ?',
            [newIsActive, status, id]
        );

        // Log the action in audit_logs
        const actionType = status === 'active' ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED';
        const details = `Staff account ${staffUser.full_name} status changed to ${status}`;
        const performerId = req.user?.userId || 0;

        try {
            await connection.query(
                'INSERT INTO audit_logs (action_type, target_user_id, performed_by, details) VALUES (?, ?, ?, ?)',
                [actionType, id, performerId, details]
            );
        } catch (auditErr) {
            console.warn('Audit log failed:', auditErr.message);
        }

        await connection.commit();
        res.json({
            message: `Staff status updated to ${status}`,
            is_active: newIsActive
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Toggle staff status error:', err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (connection) connection.release();
    }
};

export const updateStaffPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ message: 'Permissions must be an array' });
        }

        const permissionsJson = JSON.stringify(permissions);
        await pool.query('UPDATE staff_users SET permissions = ? WHERE id = ?', [permissionsJson, id]);

        res.json({ message: 'Permissions updated successfully' });
    } catch (err) {
        console.error('Update staff permissions error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateStaffRole = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { role_name } = req.body;

        // 1. Get role ID
        const [roleRows] = await connection.query('SELECT id FROM staff_roles WHERE role_name = ?', [role_name]);
        if (roleRows.length === 0) {
            return res.status(400).json({ message: 'Invalid role name' });
        }
        const roleId = roleRows[0].id;

        // Define default permissions for roles (aligned with staff.work.routes and dashboard)
        const ROLE_DEFAULTS = {
            'admin': [
                'orders.view', 'orders.view_dine_in', 'orders.view_takeaway', 'orders.view_delivery',
                'orders.status_update', 'orders.accept_reject',
                'menu.manage', 'payments.view', 'payments.status', 'notifications.receive'
            ],
            'manager': [
                'orders.view', 'orders.view_dine_in', 'orders.view_takeaway', 'orders.view_delivery',
                'orders.status_update', 'orders.accept_reject',
                'menu.manage', 'payments.view', 'payments.status', 'notifications.receive'
            ],
            'cashier': [
                'orders.view', 'orders.view_dine_in', 'orders.view_takeaway', 'orders.view_delivery',
                'orders.status_update', 'payments.view', 'payments.status', 'notifications.receive'
            ],
            'steward': [
                'orders.view', 'orders.view_dine_in', 'orders.status_update', 'orders.accept_reject',
                'notifications.receive'
            ],
            'kitchen_staff': [
                'orders.view', 'orders.view_dine_in', 'orders.view_takeaway', 'orders.view_delivery',
                'orders.status_update'
            ],
            'bar_staff': [
                'orders.view', 'orders.view_dine_in', 'orders.status_update'
            ],
            'delivery_rider': [
                'orders.view', 'orders.view_delivery', 'orders.status_update'
            ],
            'inventory_manager': ['inventory.view', 'inventory.update'],
            'supplier': []
        };

        const permissions = JSON.stringify(ROLE_DEFAULTS[role_name.toLowerCase()] || ['orders.view']);

        // 2. Update staff_users with both role and default permissions
        await connection.query('UPDATE staff_users SET role_id = ?, permissions = ? WHERE id = ?', [roleId, permissions, id]);

        await connection.commit();
        res.json({ message: `Role updated to ${role_name} with default permissions` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Update staff role error:', err);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (connection) connection.release();
    }
};

// --- Customer Management ---
export const getAllCustomers = async (req, res) => {
    try {
        const [customers] = await pool.query(
            `SELECT id, name, email, phone, loyalty_points, is_active, created_at
             FROM online_customers
             ORDER BY created_at DESC`
        );

        const customersWithStatus = customers.map(c => ({
            ...c,
            status: c.is_active ? 'active' : 'inactive'
        }));
        res.json({ customers: customersWithStatus });
    } catch (err) {
        console.error('Get all customers error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateCustomerPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        const [tables] = await pool.query("SHOW TABLES LIKE 'customer_permissions'");

        if (tables.length === 0) {
            return res.status(501).json({ message: 'Customer permissions not implemented in current schema' });
        }

        await pool.query('DELETE FROM customer_permissions WHERE customer_id = ?', [id]);

        if (permissions && permissions.length > 0) {
            const values = permissions.map(p => [id, p, true]);
            await pool.query('INSERT INTO customer_permissions (customer_id, permission_key, allowed) VALUES ?', [values]);
        }

        res.json({ message: 'Customer permissions updated' });
    } catch (err) {
        console.error('Update customer permissions error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'inactive'
        const newIsActive = status === 'active' ? 1 : 0;

        await pool.query('UPDATE online_customers SET is_active = ? WHERE id = ?', [newIsActive, id]);
        
        // Audit log
        try {
            const performerId = req.user?.userId || 0;
            const actionType = status === 'active' ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED';
            await pool.query(
                'INSERT INTO audit_logs (action_type, target_user_id, performed_by, details) VALUES (?, ?, ?, ?)',
                [actionType, id, performerId, `Customer account status changed to ${status}`]
            );
        } catch (e) {}

        res.json({ message: `Customer status updated to ${status}` });
    } catch (err) {
        console.error('Toggle customer status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Order Management ---
export const getAllOrders = async (req, res) => {
    try {
        const [deliveryOrders] = await pool.query(`
            SELECT do.*, "DELIVERY" as order_type, customer_name,
                   'Guest' as customer_type,
                   do.items as items
            FROM delivery_orders do
            ORDER BY do.created_at DESC
        `);
        const [takeawayOrders] = await pool.query('SELECT *, "TAKEAWAY" as order_type FROM takeaway_orders ORDER BY created_at DESC');
        const [dineInOrders] = await pool.query(`
            SELECT o.*, "DINE-IN" as order_type, rt.table_number, os.name as status, c.name as customer_name,
                   su.full_name as steward_name,
                   CASE WHEN o.customer_id IS NOT NULL THEN 'Registered' ELSE 'Guest' END as customer_type,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)
                   ) FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id) as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            ORDER BY o.created_at DESC
        `);
        const allOrders = [
            ...deliveryOrders,
            ...takeawayOrders,
            ...dineInOrders
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Map Dine-in statuses to user preferred names if they don't match
        const statusMap = {
            'PENDING': 'Pending',
            'PREPARING': 'Cooking',
            'READY': 'Ready to Serve',
            'SERVED': 'Served',
            'COMPLETED': 'Completed',
            'CANCELLED': 'Cancelled',
            'READY_TO_SERVE': 'Ready to Serve',
            'FINISHED': 'Completed',
            'COOKING': 'Cooking'
        };

        const parsedOrders = allOrders.map(o => {
            // Normalize status
            const rawStatus = (o.order_status || o.status || 'Pending').toUpperCase();
            const normalizedStatus = statusMap[rawStatus] || rawStatus;

            // Normalize items
            let items = [];
            if (typeof o.items === 'string') {
                try {
                    items = JSON.parse(o.items);
                } catch (e) {
                    items = [];
                }
            } else {
                items = o.items || [];
            }

            return {
                ...o,
                status: normalizedStatus,
                items
            };
        });

        res.json({ orders: parsedOrders });
    } catch (err) {
        console.error('Get all orders error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { order_type, customer_name, phone, items, total_price, notes, table_id, address } = req.body;
        const performerId = req.user?.userId || 0;

        if (order_type === 'DINE-IN') {
            const [pendingStatus] = await connection.query('SELECT id FROM order_statuses WHERE name = "PENDING"');
            const statusId = pendingStatus[0]?.id || 1;

            const finalOrderType = 'guest'; // Admin orders via this route are usually guest or we'd have a customer selection
            
            // 'orders' table for DINE_IN
            const [result] = await connection.query(
                'INSERT INTO orders (customer_id, table_id, status_id, order_type_id, order_type, total_price) VALUES (?, ?, ?, 1, ?, ?)',
                [null, table_id || null, statusId, finalOrderType, total_price || 0]
            );

            // Update table status to 'not available'
            if (table_id) {
                await connection.query('UPDATE restaurant_tables SET status = "not available" WHERE id = ?', [table_id]);
            }
            
            for (const item of items) {
                await connection.query(
                    'INSERT INTO order_analytics (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [result.insertId, 'DINE-IN', 'pending', 'CASH', item.id, item.name, item.category || 'General', item.quantity, item.price, item.price * item.quantity]
                );
            }

        } else if (order_type === 'TAKEAWAY') {
            const [result] = await connection.query(
                'INSERT INTO takeaway_orders (customer_name, phone, items, total_price, notes, order_status, payment_status, pickup_time) VALUES (?, ?, ?, ?, ?, "pending", "paid", ?)',
                [customer_name, phone, JSON.stringify(items), total_price, notes || '', new Date().toLocaleTimeString()]
            );

            for (const item of items) {
                await connection.query(
                    'INSERT INTO order_analytics (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [result.insertId, 'TAKEAWAY', 'pending', 'CASH', item.id, item.name, item.category || 'General', item.quantity, item.price, item.price * item.quantity]
                );
            }

        } else if (order_type === 'DELIVERY') {
            const [result] = await connection.query(
                'INSERT INTO delivery_orders (customer_name, phone, address, items, total_price, notes, order_status, payment_status) VALUES (?, ?, ?, ?, ?, ?, "pending", "paid")',
                [customer_name, phone, address || '', JSON.stringify(items), total_price, notes || '']
            );

            for (const item of items) {
                await connection.query(
                    'INSERT INTO order_analytics (order_id, order_source, order_status, payment_method, item_id, item_name, category_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [result.insertId, 'DELIVERY', 'pending', 'CASH', item.id, item.name, item.category || 'General', item.quantity, item.price, item.price * item.quantity]
                );
            }
        }

        // Log to audit log
        try {
            await connection.query(
                'INSERT INTO audit_logs (action_type, performed_by, details) VALUES (?, ?, ?)',
                ['ORDER_CREATED', performerId, `Manual ${order_type} order created for ${customer_name || 'Guest'}`]
            );
        } catch (e) {}

        await connection.commit();
        res.status(201).json({ message: 'Order created successfully' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
};

export const cancelOrder = async (req, res) => {
    try {
        const { id, type } = req.params; // type: DELIVERY, TAKEAWAY, DINE-IN
        const { reason } = req.body;

        const [cancelStatus] = await pool.query('SELECT id FROM order_statuses WHERE name = "CANCELLED"');
        const cancelStatusId = cancelStatus[0]?.id;

        if (type === 'DELIVERY') {
            await pool.query('UPDATE delivery_orders SET order_status = "CANCELLED", status_notes = ? WHERE id = ?', [reason, id]);
        } else if (type === 'TAKEAWAY') {
            await pool.query('UPDATE takeaway_orders SET order_status = "CANCELLED", status_notes = ? WHERE id = ?', [reason, id]);
        } else if (type === 'DINE-IN') {
            const [statusRows] = await pool.query('SELECT id FROM order_statuses WHERE name = "CANCELLED"');
            const cancelStatusId = statusRows[0]?.id;
            if (cancelStatusId) {
                // For DINE-IN, if it's from admin, we might bypass request or use the same flow
                // But generally admin can direct cancel
                await pool.query('UPDATE orders SET status_id = ?, cancellation_reason = ?, cancellation_status = "APPROVED" WHERE id = ?', [cancelStatusId, reason, id]);
            }
        }

        res.json({ message: 'Order cancelled successfully' });
    } catch (err) {
        console.error('Cancel order error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getCancellationRequests = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT cr.*, 
                   COALESCE(rt.table_number, 'N/A') as table_number,
                   (SELECT full_name FROM staff_users WHERE id = cr.requested_by LIMIT 1) as staff_name,
                   (SELECT name FROM online_customers WHERE id = cr.requested_by LIMIT 1) as customer_name
            FROM cancel_requests cr
            LEFT JOIN orders o ON cr.order_id = o.id AND cr.order_type = 'dine_in'
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            WHERE cr.status = 'pending'
            ORDER BY cr.created_at DESC
        `);

        const requests = rows.map(r => ({
            ...r,
            steward_name: r.staff_name || r.customer_name || 'Guest'
        }));

        res.json({ requests });
    } catch (error) {
        console.error('Get cancellation requests error:', error);
        res.status(500).json({ message: 'Failed to fetch requests' });
    }
};

export const handleCancellationAction = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // request id
        const { action, admin_notes } = req.body; // action: approve, reject

        await connection.beginTransaction();

        const [requestRows] = await connection.query('SELECT * FROM cancel_requests WHERE id = ?', [id]);
        if (requestRows.length === 0) return res.status(404).json({ message: 'Request not found' });
        
        const request = requestRows[0];
        const status = action === 'approve' ? 'approved' : 'rejected';

        // 1. Update request status
        await connection.query(
            'UPDATE cancel_requests SET status = ?, admin_notes = ? WHERE id = ?',
            [status, admin_notes, id]
        );

        if (action === 'approve') {
            if (request.order_type === 'delivery') {
                await connection.query(
                    "UPDATE delivery_orders SET order_status = 'Cancelled', status_notes = ? WHERE id = ?",
                    [request.reason, request.order_id]
                );
            } else if (request.order_type === 'takeaway') {
                await connection.query(
                    "UPDATE takeaway_orders SET order_status = 'CANCELLED', status_notes = ? WHERE id = ?",
                    [request.reason, request.order_id]
                );
            } else {
                // Dine-in order cancellation
                const [cancelStatus] = await connection.query('SELECT id FROM order_statuses WHERE name = "CANCELLED"');
                const cancelStatusId = cancelStatus[0]?.id;
                
                await connection.query(
                    'UPDATE orders SET status_id = ?, cancellation_status = "APPROVED", cancellation_reason = ? WHERE id = ?',
                    [cancelStatusId || 0, request.reason, request.order_id]
                );

                // Free up table if it was DINE-IN
                const [orderRows] = await connection.query('SELECT table_id FROM orders WHERE id = ?', [request.order_id]);
                if (orderRows.length > 0 && orderRows[0].table_id) {
                    await connection.query('UPDATE restaurant_tables SET status = "available" WHERE id = ?', [orderRows[0].table_id]);
                }
            }
        } else {
             if (request.order_type === 'dine_in') {
                await connection.query(
                    'UPDATE orders SET cancellation_status = "REJECTED" WHERE id = ?',
                    [request.order_id]
                );
             }
        }

        await connection.commit();
        res.json({ message: `Cancellation successfully ${status}` });
    } catch (error) {
        await connection.rollback();
        console.error('Handle cancel action error:', error);
        res.status(500).json({ message: 'Action failed: ' + error.message });
    } finally {
        connection.release();
    }
};


export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, type } = req.body; // type: DELIVERY, TAKEAWAY, DINE-IN

        // Reverse map user names to DB names if needed
        const dbStatusMap = {
            'Cooking': 'PREPARING',
            'Ready to Serve': 'READY',
            'Served': 'SERVED',
            'Finished': 'COMPLETED',
            'Cancelled': 'CANCELLED'
        };

        const dbStatus = dbStatusMap[status] || status.toUpperCase();

        if (type === 'DELIVERY') {
            await pool.query('UPDATE delivery_orders SET order_status = ? WHERE id = ?', [status, id]);
        } else if (type === 'TAKEAWAY') {
            await pool.query('UPDATE takeaway_orders SET order_status = ? WHERE id = ?', [status, id]);
        } else {
            const [statusRows] = await pool.query('SELECT id, name FROM order_statuses WHERE name = ?', [dbStatus]);
            if (statusRows.length > 0) {
                const statusId = statusRows[0].id;
                const statusName = statusRows[0].name;
                await pool.query('UPDATE orders SET status_id = ? WHERE id = ?', [statusId, id]);

                // If completed/finished/cancelled, free the table (Requirement 11)
                if (['COMPLETED', 'FINISHED', 'CANCELLED'].includes(statusName)) {
                    const [orderRows] = await pool.query('SELECT table_id FROM orders WHERE id = ?', [id]);
                    if (orderRows.length > 0 && orderRows[0].table_id) {
                        await pool.query('UPDATE restaurant_tables SET status = "available" WHERE id = ?', [orderRows[0].table_id]);
                        console.log(`[StatusUpdate] Table ${orderRows[0].table_id} freed due to order ${id} status: ${statusName}`);
                    }
                }
            }
        }
        
        // Real-time update emit (Requirement 13)
        if (global.io) {
            global.io.emit('orderUpdate', { id, type: type || 'DINE-IN', status: dbStatus });
        }

        res.json({ message: 'Order status updated' });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Stats ---
export const getStats = async (req, res) => {
    try {
        const [[{ deliveryCount }]] = await pool.query('SELECT COUNT(*) as deliveryCount FROM delivery_orders');
        const [[{ takeawayCount }]] = await pool.query('SELECT COUNT(*) as takeawayCount FROM takeaway_orders');
        const [[{ customerCount }]] = await pool.query('SELECT COUNT(*) as customerCount FROM online_customers');
        const [[{ staffCount }]] = await pool.query('SELECT COUNT(*) as staffCount FROM staff_users');
        const [[{ activeStaffCount }]] = await pool.query('SELECT COUNT(*) as activeStaffCount FROM staff_attendance WHERE date = CURDATE() AND check_out_time IS NULL');
        const [[{ count: newCustomersWeekCount }]] = await pool.query('SELECT COUNT(*) as count FROM online_customers WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');

        
        const [ordersToday] = await pool.query(`
            SELECT COUNT(*) as count FROM (
                SELECT id FROM delivery_orders WHERE DATE(created_at) = CURDATE()
                UNION ALL
                SELECT id FROM takeaway_orders WHERE DATE(created_at) = CURDATE()
                UNION ALL
                SELECT id FROM orders WHERE DATE(created_at) = CURDATE()
            ) as t
        `);

        // Revenue Totals - INCLUDES DINE-IN
        const [[{ todayRevenue }]] = await pool.query(`
             SELECT (
                COALESCE((SELECT SUM(total_price) FROM delivery_orders WHERE payment_status = 'paid' AND DATE(created_at) = CURDATE()), 0) + 
                COALESCE((SELECT SUM(total_price) FROM takeaway_orders WHERE payment_status = 'paid' AND DATE(created_at) = CURDATE()), 0) +
                COALESCE((SELECT SUM(total_price) FROM order_analytics WHERE order_source = 'DINE-IN' AND DATE(created_at) = CURDATE()), 0)
            ) as todayRevenue
        `);

        const [[{ totalRevenue }]] = await pool.query(`
             SELECT (
                COALESCE((SELECT SUM(total_price) FROM delivery_orders WHERE payment_status = 'paid'), 0) + 
                COALESCE((SELECT SUM(total_price) FROM takeaway_orders WHERE payment_status = 'paid'), 0) +
                COALESCE((SELECT SUM(total_price) FROM order_analytics WHERE order_source = 'DINE-IN'), 0)
            ) as totalRevenue
        `);

        const [[{ weekRev }]] = await pool.query(`
             SELECT (
                COALESCE((SELECT SUM(total_price) FROM delivery_orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) + 
                COALESCE((SELECT SUM(total_price) FROM takeaway_orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0) +
                COALESCE((SELECT SUM(total_price) FROM order_analytics WHERE order_source = 'DINE-IN' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)), 0)
            ) as weekRev
        `);

        const [[{ monthRev }]] = await pool.query(`
             SELECT (
                COALESCE((SELECT SUM(total_price) FROM delivery_orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0) + 
                COALESCE((SELECT SUM(total_price) FROM takeaway_orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0) +
                COALESCE((SELECT SUM(total_price) FROM order_analytics WHERE order_source = 'DINE-IN' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)), 0)
            ) as monthRev
        `);

        // Category breakdown for Today
        const [todayCategories] = await pool.query(`
            SELECT category_name, SUM(total_price) as revenue
            FROM order_analytics
            WHERE DATE(created_at) = CURDATE()
            GROUP BY category_name
        `);

        res.json({ 
            stats: {
                revenue: totalRevenue || 0,
                todayRevenue: todayRevenue || 0,
                weekRevenue: weekRev || 0,
                monthRevenue: monthRev || 0,
                totalOrders: deliveryCount + takeawayCount + (ordersToday[0].count - (deliveryCount + takeawayCount)), // Combined total
                orders: deliveryCount + takeawayCount,
                activeStaff: activeStaffCount,
                staffCount: staffCount,
                staff: staffCount,
                totalCustomers: customerCount,
                customerCount: customerCount,
                customers: customerCount,
                
                details: {
                    todayOrders: ordersToday[0].count,
                    newCustomersWeek: newCustomersWeekCount,
                    todayCategories,
                    totalRevenue: totalRevenue || 0
                }
            } 
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getRevenueAnalytics = async (req, res) => {
    try {
        const dailyRevenue = await pool.query(`
            SELECT date, SUM(total_price) as revenue, COUNT(DISTINCT order_id) as orders
            FROM (
                SELECT DATE(created_at) as date, id as order_id, total_price FROM delivery_orders WHERE payment_status = 'paid'
                UNION ALL
                SELECT DATE(created_at) as date, id as order_id, total_price FROM takeaway_orders WHERE payment_status = 'paid'
                UNION ALL
                SELECT DATE(created_at) as date, order_id, SUM(total_price) as total_price 
                FROM order_analytics 
                WHERE order_source = 'DINE-IN' 
                GROUP BY order_id, DATE(created_at)
            ) combined
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 10 DAY)
            GROUP BY date
            ORDER BY date ASC
        `);

        const typeBreakdown = await pool.query(`
            SELECT 'Delivery' as type, COALESCE(SUM(total_price), 0) as revenue FROM delivery_orders WHERE payment_status = 'paid'
            UNION ALL
            SELECT 'Takeaway' as type, COALESCE(SUM(total_price), 0) as revenue FROM takeaway_orders WHERE payment_status = 'paid'
            UNION ALL
            SELECT 'Dine-in' as type, COALESCE(SUM(total_price), 0) as revenue FROM order_analytics WHERE order_source = 'DINE-IN'
        `);

        res.json({
            daily: dailyRevenue[0],
            breakdown: typeBreakdown[0]
        });
    } catch (err) {
        console.error('Revenue analytics error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Reservation Management ---
export const getAllReservations = async (req, res) => {
    try {
        const { date } = req.query;
        let query = `
            SELECT r.*, rt.table_number, da.area_name
            FROM reservations r
            LEFT JOIN restaurant_tables rt ON r.table_id = rt.id
            LEFT JOIN dining_areas da ON r.area_id = da.id
        `;
        const params = [];

        if (date) {
            query += " WHERE r.reservation_date = ? ";
            params.push(date);
        }

        query += " ORDER BY r.reservation_date DESC, r.reservation_time ASC, r.created_at DESC";

        const [reservations] = await pool.query(query, params);
        res.json({ reservations });
    } catch (err) {
        console.error('Get all reservations error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        if (!validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ message: 'Invalid reservation status' });
        }

        await pool.query('UPDATE reservations SET reservation_status = ? WHERE id = ?', [status.toUpperCase(), id]);
        res.json({ message: 'Reservation status updated' });
    } catch (err) {
        console.error('Update reservation status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Table & Area Management ---
export const getAllAreas = async (req, res) => {
    try {
        const [areas] = await pool.query('SELECT * FROM dining_areas ORDER BY id ASC');
        res.json({ areas });
    } catch (err) {
        console.error('Get all areas error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const addArea = async (req, res) => {
    try {
        const { area_name, description } = req.body;
        await pool.query('INSERT INTO dining_areas (area_name, description) VALUES (?, ?)', [area_name, description]);
        res.status(201).json({ message: 'Dining area added successfully' });
    } catch (err) {
        console.error('Add area error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateArea = async (req, res) => {
    try {
        const { id } = req.params;
        const { area_name, description } = req.body;
        await pool.query('UPDATE dining_areas SET area_name = ?, description = ? WHERE id = ?', [area_name, description, id]);
        res.json({ message: 'Dining area updated' });
    } catch (err) {
        console.error('Update area error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getAllTables = async (req, res) => {
    try {
        const { date, time } = req.query;
        
        // 1. Get all tables with area names
        const [tables] = await pool.query(`
            SELECT t.*, a.area_name 
            FROM restaurant_tables t
            JOIN dining_areas a ON t.area_id = a.id
            ORDER BY a.area_name, t.table_number
        `);

        // 2. If date and time are provided, fetch reservations for that slot
        if (date && time) {
            const [reservations] = await pool.query(`
                SELECT r.*, c.name as customer_name, c.phone as customer_phone
                FROM reservations r
                LEFT JOIN online_customers c ON r.customer_id = c.id
                WHERE r.reservation_date = ? AND r.reservation_time = ?
                AND r.reservation_status NOT IN ('CANCELLED')
            `, [date, time]);

            const tableReservationMap = {};
            reservations.forEach(r => {
                tableReservationMap[r.table_id] = r;
            });

            const enrichedTables = tables.map(t => {
                const res = tableReservationMap[t.id];
                if (res) {
                    return {
                        ...t,
                        current_status: 'reserved',
                        reservation_details: {
                            id: res.id,
                            customer_name: res.customer_name || res.guest_name || 'Guest',
                            time: res.reservation_time,
                            guests: res.guest_count
                        }
                    };
                }
                return {
                    ...t,
                    current_status: t.status // original status (available/occupied)
                };
            });
            return res.json({ tables: enrichedTables });
        }

        res.json({ tables });
    } catch (err) {
        console.error('Get all tables error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const addTable = async (req, res) => {
    try {
        const { area_id, table_number, capacity } = req.body;
        await pool.query('INSERT INTO restaurant_tables (area_id, table_number, capacity) VALUES (?, ?, ?)', [area_id, table_number, capacity]);
        res.status(201).json({ message: 'Table added successfully' });
    } catch (err) {
        console.error('Add table error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { area_id, table_number, capacity, status } = req.body;
        await pool.query(
            'UPDATE restaurant_tables SET area_id = ?, table_number = ?, capacity = ?, status = ? WHERE id = ?',
            [area_id, table_number, capacity, status, id]
        );
        res.json({ message: 'Table updated successfully' });
    } catch (err) {
        console.error('Update table error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'available', 'occupied', 'reserved'
        await pool.query('UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: `Table status updated to ${status}` });
    } catch (err) {
        console.error('Update table status error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- Audit Logs ---
export const getAuditLogs = async (req, res) => {
    try {
        const { limit = 100, offset = 0, action_type, target_user_id } = req.query;

        let query = `
            SELECT a.id, a.action_type, a.details, a.created_at, a.ip_address,
                   t.full_name as target_user_name, t.email as target_user_email,
                   p.full_name as performed_by_name, p.email as performed_by_email
            FROM audit_logs a
            LEFT JOIN staff_users t ON a.target_user_id = t.id
            LEFT JOIN staff_users p ON a.performed_by = p.id
            WHERE 1=1
        `;

        const params = [];

        if (action_type) {
            query += ` AND a.action_type = ?`;
            params.push(action_type);
        }

        if (target_user_id) {
            query += ` AND a.target_user_id = ?`;
            params.push(target_user_id);
        }

        query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.query(query, params);

        let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
        const countParams = [];

        if (action_type) {
            countQuery += ` AND action_type = ?`;
            countParams.push(action_type);
        }

        if (target_user_id) {
            countQuery += ` AND target_user_id = ?`;
            countParams.push(target_user_id);
        }

        const [[{ total }]] = await pool.query(countQuery, countParams);

        res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (err) {
        console.error('Get audit logs error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
