
import pool from '../config/db.js';

/**
 * GET /api/kitchen/orders
 * Fetch all active orders for the kitchen (excluding beverages)
 */
export const getKitchenOrders = async (req, res) => {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED'];

        // 1. Dine-in Orders from 'orders' table
        // FIX: orders table has NO table_number column — only table_id. Use rt.table_number via JOIN.
        const [dineInRows] = await pool.query(`
            SELECT 
                o.id,
                o.total_price,
                o.created_at,
                rt.table_number AS table_number,
                COALESCE(os.name, 'PENDING') AS status,
                COALESCE(c.name, o.customer_name, 'Guest') AS customer_name,
                'DINE-IN' AS order_type_name,
                COALESCE(su.full_name, 'N/A') AS steward_name,
                o.kitchen_status, o.bar_status, o.main_status
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            WHERE (os.name IS NULL OR UPPER(os.name) NOT IN (?))
            ORDER BY o.created_at DESC
        `, [terminalStatuses]);

        const dineInWithItems = await Promise.all(dineInRows.map(async (order) => {
            // Fetch all non-beverage items for each order
            const [items] = await pool.query(`
                SELECT oi.id, mi.name, oi.quantity, oi.price,
                       COALESCE(cat.name, 'Food') AS category,
                       COALESCE(oi.notes, '') AS notes
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ?
                  AND (cat.name IS NULL OR LOWER(cat.name) NOT LIKE '%beverage%')
            `, [order.id]);
            return { ...order, items: items || [] };
        }));

        // 2. Takeaway Orders
        const [takeawayRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL AS table_number, UPPER(order_status) AS status,
                   customer_name, 'TAKEAWAY' AS order_type_name, 'N/A' AS steward_name, items
            FROM takeaway_orders
            WHERE (order_status IS NULL OR UPPER(order_status) NOT IN (?))
            ORDER BY created_at DESC
        `, [terminalStatuses]);

        const takeawayOrders = takeawayRows.map(o => {
            let parsedItems = [];
            try {
                parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            } catch (_) { parsedItems = []; }
            const foodItems = (parsedItems || []).filter(i => !(
                (i.category || i.category_name || i.categoryName || '').toLowerCase().includes('beverage')
            ));
            return { ...o, items: foodItems };
        });

        // 3. Delivery Orders (Stored as JSON items in delivery_orders table)
        const [deliveryRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL AS table_number, UPPER(order_status) AS status,
                   customer_name, 'DELIVERY' AS order_type_name, 'Rider' AS steward_name, items
            FROM delivery_orders
            WHERE (order_status IS NULL OR UPPER(order_status) NOT IN (?))
            ORDER BY created_at DESC
        `, [terminalStatuses]);

        const deliveryOrders = deliveryRows.map(o => {
            let parsedItems = [];
            try {
                parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            } catch (_) { parsedItems = []; }
            const foodItems = (parsedItems || []).filter(i => !(
                (i.category || i.category_name || i.categoryName || '').toLowerCase().includes('beverage')
            ));
            return { ...o, items: foodItems };
        });

        // Combine all active orders — include orders even with 0 food items
        // (kitchen still needs to see the order ticket; bar handles beverages)
        const allOrders = [...dineInWithItems, ...takeawayOrders, ...deliveryOrders]
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // oldest first for kitchen priority

        console.log(`[Kitchen] Found ${dineInRows.length} dine-in, ${takeawayRows.length} takeaways, ${deliveryRows.length} deliveries.`);
        console.log(`[Kitchen] Returning ${allOrders.length} active orders.`);
        
        res.json({ orders: allOrders });
    } catch (error) {
        console.error('Kitchen orders SQL error:', error.message);
        res.status(500).json({ message: 'Failed to fetch kitchen orders', detail: error.message });
    }
};

/**
 * PUT /api/kitchen-bar/kitchen/orders/:id/status
 * Kitchen staff can update order status to PREPARING or READY
 */
export const updateKitchenOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, type, isBar = false } = req.body;

        // Requirement #1: Unified Lifecycle Normalization
        let normalized = (status || '').toUpperCase().trim();
        if (normalized === 'READY TO SERVE') normalized = 'READY';

        const allowed = ['PREPARING', 'READY'];
        if (!allowed.includes(normalized)) {
            return res.status(400).json({ message: `Invalid status: ${status}` });
        }

        const orderType = (type || '').toUpperCase();
        if (orderType !== 'DINE-IN') {
             // For simplicity, takeaway/delivery follow standard preparation
             await pool.query(`UPDATE ${orderType === 'DELIVERY' ? 'delivery_orders' : 'takeaway_orders'} SET order_status = ? WHERE id = ?`, [normalized, id]);
        } else {
            // Requirement #2 & #3: Smart Split Status logic
            const statusField = isBar ? 'bar_status' : 'kitchen_status';
            const otherField = isBar ? 'kitchen_status' : 'bar_status';
            
            await pool.query(`UPDATE orders SET ${statusField} = ? WHERE id = ?`, [normalized.toLowerCase(), id]);

            // Requirement #3: PREPARING stage logic
            if (normalized === 'PREPARING') {
                const [statusRows] = await pool.query('SELECT id FROM order_statuses WHERE name = "PREPARING"');
                if (statusRows.length > 0) {
                    await pool.query('UPDATE orders SET status_id = ?, main_status = "PREPARING" WHERE id = ?', [statusRows[0].id, id]);
                }
            }

            // Requirement #3: READY_TO_SERVE stage logic
            if (normalized === 'READY') {
                const [orderRows] = await pool.query(`SELECT ${otherField} FROM orders WHERE id = ?`, [id]);
                const otherStatus = orderRows[0] ? orderRows[0][otherField] : 'pending';
                
                if (otherStatus === 'ready') {
                    const [sr] = await pool.query('SELECT id FROM order_statuses WHERE name = "READY_TO_SERVE"');
                    if (sr.length > 0) {
                        await pool.query('UPDATE orders SET status_id = ?, main_status = "READY_TO_SERVE" WHERE id = ?', [sr[0].id, id]);
                    }
                }
            }
        }

        // Fetch unified info for broadcasting
        const [updated] = await pool.query(`
            SELECT o.id, o.main_status, o.kitchen_status, o.bar_status, os.name as status,
                   rt.table_number, su.id as staff_id
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            WHERE o.id = ?
        `, [id]);

        if (global.io && updated.length > 0) {
            const ord = updated[0];
            // Requirement #8 & #11: Unified Broadcast
            global.io.emit('orderStatusUpdated', {
                orderId: ord.id,
                mainStatus: ord.main_status || ord.status,
                kitchenStatus: ord.kitchen_status,
                barStatus: ord.bar_status,
                tableNumber: ord.table_number,
                staffId: ord.staff_id,
                updatedBy: isBar ? 'BAR' : 'KITCHEN'
            });

            // Legacy support for older listeners
            global.io.emit('orderUpdate', { 
                id: ord.id, orderId: ord.id, status: ord.main_status || ord.status, 
                staffId: ord.staff_id, tableNumber: ord.table_number 
            });

            // Requirement #4: Steward voice notification ONLY when fully ready
            if (ord.main_status === 'READY_TO_SERVE' || ord.status === 'READY_TO_SERVE') {
                global.io.emit('orderReadyNotify', {
                    orderId: ord.id,
                    tableNumber: ord.table_number,
                    staffId: ord.staff_id,
                    message: `Order #${ord.id} for Table ${ord.table_number} is ready to serve!`
                });
            }
        }

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Error updating status' });
    }
};

/**
 * GET /api/bar/orders
 * Fetch all active orders for the bar (only beverages)
 */

export const getBarOrders = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.id, o.total_price, o.created_at, rt.table_number, os.name as status,
                   coalesce(o.customer_name, c.name) as customer_name,
                   coalesce(o.phone, c.phone) as customer_phone,
                   c.email as customer_email,
                   coalesce(ot.name, 'DINE_IN') as order_type_name,
                   COALESCE(su.full_name, 'System') as steward_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price, 'category', cat.name)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   LEFT JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id) as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN stewards s ON o.steward_id = s.id
            LEFT JOIN staff_users su ON s.staff_id = su.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name IS NULL OR UPPER(os.name) NOT IN ('COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED')
            AND (o.bar_status != 'ready' OR o.main_status = 'PLACED' OR o.main_status = 'PREPARING')
            
            UNION ALL

            SELECT to_ord.id, to_ord.total_price, to_ord.created_at, NULL as table_number, UPPER(to_ord.order_status) as status,
                   to_ord.customer_name, to_ord.phone as customer_phone, NULL as customer_email, 'TAKEAWAY' as order_type_name,
                   'Takeaway' as steward_name,
                   NULL as items
            FROM takeaway_orders to_ord
            WHERE UPPER(to_ord.order_status) NOT IN ('COMPLETED', 'CANCELLED', 'DELIVERED')

            UNION ALL

            SELECT do.id, do.total_price, do.created_at, NULL as table_number, UPPER(do.order_status) as status,
                   do.customer_name, do.phone as customer_phone, NULL as customer_email, 'DELIVERY' as order_type_name,
                   'Rider' as steward_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', doi.id, 'name', mi.name, 'quantity', doi.quantity, 'price', mi.price, 'category', cat.name)
                   ) FROM delivery_order_items doi 
                   JOIN menu_items mi ON doi.menu_item_id = mi.id 
                   LEFT JOIN categories cat ON mi.category_id = cat.id
                   WHERE doi.order_id = do.id) as items
            FROM delivery_orders do
            WHERE UPPER(do.order_status) NOT IN ('DELIVERED', 'CANCELLED', 'COMPLETED')
            
            ORDER BY created_at ASC
        `);

        // 2. Fetch and parse takeaway items which are stored as JSON strings
        const [takeawayDetails] = await pool.query("SELECT id, items FROM takeaway_orders WHERE order_status NOT IN ('Completed', 'Cancelled', 'Delivered')");
        const takeawayMap = {};
        takeawayDetails.forEach(t => {
            try {
                takeawayMap[t.id] = typeof t.items === 'string' ? JSON.parse(t.items) : (t.items || []);
            } catch (e) {
                takeawayMap[t.id] = [];
            }
        });

        // 3. Process and filter all orders
        console.log(`[Bar] Total orders in Union: ${orders.length}`);
        const barOrders = orders.map(o => {
            let pItems = [];
            if (o.order_type_name === 'TAKEAWAY' && takeawayMap[o.id]) {
                pItems = takeawayMap[o.id];
            } else {
                let itemsRaw = o.items;
                if (itemsRaw) {
                    if (Buffer.isBuffer(itemsRaw)) {
                        itemsRaw = itemsRaw.toString('utf8');
                    }
                    try {
                        pItems = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;
                    } catch (e) {
                        pItems = [];
                    }
                }
            }

            // Filter only beverages for bar
            o.items = (pItems || []).filter(i => {
                const cat = (i.category || i.category_name || '').toLowerCase();
                return cat === 'beverages';
            });

            if (o.items.length === 0 && (pItems || []).length > 0) {
                console.log(`[Bar] Order ${o.id} (${o.order_type_name}) filtered out - no beverages found.`);
            }
            return o;
        }).filter(o => o.items && o.items.length > 0);

        console.log(`[Bar] Found ${orders.length} in DB, showing ${barOrders.length} in Bar`);
        res.json({ orders: barOrders });
    } catch (error) {
        console.error('Bar orders error:', error);
        res.status(500).json({ message: 'Failed to fetch bar orders' });
    }
};

/**
 * GET /api/kitchen-bar/inventory
 */
export const getInventory = async (req, res) => {
    try {
        const { category } = req.query;
        let query = `
            SELECT i.*, s.name as supplier_name 
            FROM inventory i 
            LEFT JOIN suppliers s ON i.supplier_id = s.id
        `;
        const params = [];

        if (category) {
            query += " WHERE i.category = ?";
            params.push(category);
        }

        query += " ORDER BY i.item_name ASC";

        const [rows] = await pool.query(query, params);
        res.json({ inventory: rows });
    } catch (error) {
        console.error('Fetch inventory error:', error);
        res.status(500).json({ message: 'Failed to fetch inventory' });
    }
};

/**
 * GET /api/kitchen-bar/duty/status
 */
export const getDutyStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Check if there is an active attendance record for today
        const [rows] = await pool.query(
            'SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ? AND check_out_time IS NULL',
            [userId, today]
        );

        const onDuty = rows.length > 0;
        res.json({ onDuty });
    } catch (error) {
        console.error('Duty status error:', error);
        res.status(500).json({ message: 'Failed to fetch duty status' });
    }
};

/**
 * POST /api/kitchen-bar/duty/check-in
 */
export const checkIn = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Fetch staff info
        const [staff] = await connection.query(
            "SELECT su.full_name, sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [userId]
        );
        const name = staff[0]?.full_name || 'Staff';
        let role = staff[0]?.role_name || 'STAFF';

        await connection.beginTransaction();

        // 1. Update role-specific table if it's a steward (optional sync)
        if (role.toLowerCase() === 'steward') {
            await connection.query('UPDATE stewards SET is_available = 1 WHERE staff_id = ?', [userId]);
        }

        // 2. Manage attendance
        const [existing] = await connection.query(
            'SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?',
            [userId, today]
        );

        if (existing.length === 0) {
            await connection.query(
                'INSERT INTO staff_attendance (staff_id, name, role, date, check_in_time, status) VALUES (?, ?, ?, ?, NOW(), "PRESENT")',
                [userId, name, role, today]
            );
        } else {
            await connection.query(
                'UPDATE staff_attendance SET check_out_time = NULL, status = "PRESENT" WHERE id = ?',
                [existing[0].id]
            );
        }

        await connection.commit();
        res.json({ message: 'Checked in successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Check-in failed' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * POST /api/kitchen-bar/duty/check-out
 */
export const checkOut = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // Fetch staff info to check role
        const [staff] = await connection.query(
            "SELECT sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id WHERE su.id = ?",
            [userId]
        );
        const role = staff[0]?.role_name || '';

        await connection.beginTransaction();

        if (role.toLowerCase() === 'steward') {
            await connection.query('UPDATE stewards SET is_available = 0 WHERE staff_id = ?', [userId]);
        }

        await connection.query(
            'UPDATE staff_attendance SET check_out_time = NOW() WHERE staff_id = ? AND date = ? AND check_out_time IS NULL',
            [userId, today]
        );

        await connection.commit();
        res.json({ message: 'Checked out successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Check-out error:', error);
        res.status(500).json({ message: 'Check-out failed' });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * GET /api/kitchen/history
 */
export const getKitchenHistory = async (req, res) => {
    try {
        // 1. Dine-in history (explicit columns to match UNION shape)
        const [dineInHistory] = await pool.query(`
            SELECT 
                o.id,
                o.total_price,
                o.created_at,
                rt.table_number,
                COALESCE(os.name, 'COMPLETED') AS status,
                COALESCE(c.name, o.customer_name, 'Guest') AS customer_name,
                'DINE-IN' AS order_type_name
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE UPPER(os.name) IN ('COMPLETED', 'CANCELLED', 'FINISHED')
            AND EXISTS (
                SELECT 1 FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = o.id 
                AND (cat.name NOT LIKE '%Beverage%' AND cat.name NOT LIKE '%Drink%' AND cat.name NOT LIKE '%Bar%')
            )
            AND DATE(o.created_at) = CURDATE()
            ORDER BY o.created_at DESC
        `);

        const dineInWithItems = await Promise.all(dineInHistory.map(async (order) => {
            const [items] = await pool.query(`
                SELECT mi.name, oi.quantity, COALESCE(cat.name, 'Food') AS category
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ?
            `, [order.id]);
            return { ...order, items: items || [] };
        }));

        // 2. Takeaway history
        const [takeawayHistory] = await pool.query(`
            SELECT id, total_price, created_at, NULL AS table_number,
                   UPPER(order_status) AS status, customer_name,
                   'TAKEAWAY' AS order_type_name, items
            FROM takeaway_orders
            WHERE order_status IN ('Completed','Cancelled')
            AND DATE(created_at) = CURDATE()
            ORDER BY created_at DESC
        `);
        const takeawayWithItems = takeawayHistory.map(o => {
            let items = [];
            try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            return { ...o, items };
        });

        // 3. Delivery history
        const [deliveryHistory] = await pool.query(`
            SELECT id, total_price, created_at, NULL AS table_number,
                   UPPER(order_status) AS status, customer_name,
                   'DELIVERY' AS order_type_name, items
            FROM delivery_orders
            WHERE order_status IN ('Delivered','Cancelled')
            AND DATE(created_at) = CURDATE()
            ORDER BY created_at DESC
        `);
        const deliveryWithItems = deliveryHistory.map(o => {
            let items = [];
            try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            return { ...o, items };
        });

        const history = [...dineInWithItems, ...takeawayWithItems, ...deliveryWithItems]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ history });
    } catch (error) {
        console.error('Kitchen history error:', error);
        res.status(500).json({ message: 'Failed to fetch kitchen history' });
    }
};

/**
 * GET /api/bar/history
 */
export const getBarHistory = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name, ot.name as order_type_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('name', mi.name, 'quantity', oi.quantity)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id AND cat.name = 'Beverages') as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name IN ('COMPLETED', 'CANCELLED', 'FINISHED')
            AND EXISTS (
                SELECT 1 FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = o.id 
                AND (cat.name LIKE '%Beverage%' OR cat.name LIKE '%Drink%' OR cat.name LIKE '%Bar%')
            )
            AND DATE(o.created_at) = CURDATE()
            
            UNION ALL

            SELECT to_ord.id, to_ord.total_price, to_ord.created_at, NULL as table_number, UPPER(to_ord.order_status) as status,
                   to_ord.customer_name, 'TAKEAWAY' as order_type_name,
                   to_ord.items as items
            FROM takeaway_orders to_ord
            WHERE to_ord.order_status IN ('Completed', 'Cancelled')
            AND DATE(to_ord.created_at) = CURDATE()

            UNION ALL
            
            SELECT do.id, do.total_price, do.created_at, NULL as table_number, UPPER(do.order_status) as status,
                   do.customer_name, 'DELIVERY' as order_type_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('name', mi.name, 'quantity', doi.quantity)
                   ) FROM delivery_order_items doi 
                   JOIN menu_items mi ON doi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE doi.order_id = do.id AND cat.name = 'Beverages') as items
            FROM delivery_orders do
            WHERE do.order_status IN ('Delivered', 'Cancelled')
            AND DATE(do.created_at) = CURDATE()
            
            ORDER BY created_at DESC
        `);

        const history = orders.map(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            if (o.order_type_name === 'TAKEAWAY') {
                o.items = items.filter(i => i.category?.toLowerCase() === 'beverages');
            } else {
                o.items = items;
            }
            return o;
        }).filter(o => o.items && o.items.length > 0);

        res.json({ history });
    } catch (error) {
        console.error('Bar history error:', error);
        res.status(500).json({ message: 'Failed to fetch bar history' });
    }
};
