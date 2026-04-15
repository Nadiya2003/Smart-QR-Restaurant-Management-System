import pool from '../config/db.js';

/**
 * GET /api/kitchen/orders
 * Fetch all active orders for the kitchen (excluding beverages)
 */
export const getKitchenOrders = async (req, res) => {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED'];

        // 1. Dine-in Orders from 'orders' table
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
            LEFT JOIN staff_users su ON o.steward_id = su.id
            WHERE (os.name IS NULL OR UPPER(os.name) NOT IN (?))
            ORDER BY o.created_at DESC
        `, [terminalStatuses]);

        const dineInWithItems = await Promise.all(dineInRows.map(async (order) => {
            const [items] = await pool.query(`
                SELECT oi.id, mi.name, oi.quantity, oi.price, oi.item_status,
                       COALESCE(cat.name, 'Food') AS category,
                       COALESCE(oi.notes, '') AS notes
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ?
                  AND (cat.name IS NULL OR (
                      LOWER(cat.name) NOT LIKE '%beverage%' AND 
                      LOWER(cat.name) NOT LIKE '%drink%' AND 
                      LOWER(cat.name) NOT LIKE '%bar%'
                  ))
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

        // 3. Delivery Orders
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

        const allOrders = [...dineInWithItems, ...takeawayOrders, ...deliveryOrders]
            .filter(o => o.items && o.items.length > 0)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        res.json({ orders: allOrders });
    } catch (error) {
        console.error('Kitchen orders SQL error:', error.message);
        res.status(500).json({ message: 'Failed to fetch kitchen orders' });
    }
};

/**
 * PUT /api/kitchen-bar/orders/items/:itemId/status
 * Update individual item status (item-wise update)
 */
export const updateOrderItemStatus = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { status } = req.body; // 'PENDING', 'PREPARING', 'READY'
        const normalizedStatus = status.toUpperCase();

        // 1. Update the item status
        await pool.query('UPDATE order_items SET item_status = ? WHERE id = ?', [normalizedStatus.toLowerCase(), itemId]);

        // 2. Get the order ID associated with this item
        const [[{ order_id: orderId }]] = await pool.query('SELECT order_id FROM order_items WHERE id = ?', [itemId]);

        // 3. Check if all "Food" items are ready or all "Beverage" items are ready to update main station status
        const [items] = await pool.query(`
            SELECT oi.item_status, COALESCE(cat.name, 'Food') as category 
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            LEFT JOIN categories cat ON mi.category_id = cat.id
            WHERE oi.order_id = ?
        `, [orderId]);

        const isDrink = (cat) => {
            const c = (cat || '').toLowerCase();
            return c.includes('beverage') || c.includes('drink') || c.includes('bar');
        };

        const foodItems = items.filter(i => !isDrink(i.category));
        const bevItems = items.filter(i => isDrink(i.category));

        const allFoodReady = foodItems.length > 0 && foodItems.every(i => i.item_status === 'ready');
        const allBevReady = bevItems.length > 0 && bevItems.every(i => i.item_status === 'ready');
        
        const anyFoodInProgress = foodItems.some(i => i.item_status === 'preparing' || i.item_status === 'ready');
        const anyBevInProgress = bevItems.some(i => i.item_status === 'preparing' || i.item_status === 'ready');

        if (allFoodReady) await pool.query('UPDATE orders SET kitchen_status = "ready" WHERE id = ?', [orderId]);
        else if (anyFoodInProgress) await pool.query('UPDATE orders SET kitchen_status = "preparing" WHERE id = ?', [orderId]);
        
        if (allBevReady) await pool.query('UPDATE orders SET bar_status = "ready" WHERE id = ?', [orderId]);
        else if (anyBevInProgress) await pool.query('UPDATE orders SET bar_status = "preparing" WHERE id = ?', [orderId]);

        const [orderRows] = await pool.query('SELECT kitchen_status, bar_status FROM orders WHERE id = ?', [orderId]);
        const { kitchen_status, bar_status } = orderRows[0];

        const isFoodReady = foodItems.length === 0 || kitchen_status === 'ready';
        const isBevReady = bevItems.length === 0 || bar_status === 'ready';

        if (isFoodReady && isBevReady) {
            const [sr] = await pool.query('SELECT id FROM order_statuses WHERE name = "READY_TO_SERVE"');
            if (sr.length > 0) {
                await pool.query('UPDATE orders SET status_id = ?, main_status = "READY_TO_SERVE" WHERE id = ?', [sr[0].id, orderId]);
            }
        } else if (kitchen_status === 'preparing' || bar_status === 'preparing' || kitchen_status === 'ready' || bar_status === 'ready') {
            const [sp] = await pool.query('SELECT id FROM order_statuses WHERE name = "PREPARING"');
            if (sp.length > 0) {
                await pool.query('UPDATE orders SET status_id = ?, main_status = "PREPARING" WHERE id = ?', [sp[0].id, orderId]);
            }
        }

        // Fetch updated order for socket broadcast
        const [updatedOrder] = await pool.query('SELECT main_status, kitchen_status, bar_status FROM orders WHERE id = ?', [orderId]);
        const mainStatus = updatedOrder[0]?.main_status || 'PENDING';

        if (global.io) {
            global.io.emit('itemStatusUpdated', { orderId, itemId, status: normalizedStatus });
            global.io.emit('orderUpdate', { 
                orderId, 
                id: orderId,
                status: mainStatus, 
                mainStatus: mainStatus,
                itemStatus: normalizedStatus,
                kitchenStatus: updatedOrder[0]?.kitchen_status,
                barStatus: updatedOrder[0]?.bar_status
            });
            global.io.emit('orderStatusUpdated', { 
                orderId, 
                mainStatus, 
                kitchenStatus: updatedOrder[0]?.kitchen_status, 
                barStatus: updatedOrder[0]?.bar_status 
            });
        }

        res.json({ success: true, message: 'Item status updated' });
    } catch (err) {
        console.error('Update item status error:', err);
        res.status(500).json({ message: 'Error updating item status' });
    }
};

/**
 * GET /api/bar/orders
 * Fetch all active orders for the bar (only beverages)
 */
export const getBarOrders = async (req, res) => {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED'];
        
        const [dineInRows] = await pool.query(`
            SELECT o.id, o.total_price, o.created_at, rt.table_number, os.name as status,
                   coalesce(o.customer_name, c.name, 'Guest') as customer_name,
                   o.kitchen_status, o.bar_status, o.main_status,
                   COALESCE(su.full_name, 'System') as steward_name
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN staff_users su ON o.steward_id = su.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE (os.name IS NULL OR UPPER(os.name) NOT IN (?))
            ORDER BY o.created_at DESC
        `, [terminalStatuses]);

        const dineInOrders = await Promise.all(dineInRows.map(async (o) => {
            const [items] = await pool.query(`
                SELECT oi.id, mi.name, oi.quantity, oi.price, oi.item_status, cat.name as category
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ? AND (cat.name IS NOT NULL AND (
                    LOWER(cat.name) LIKE '%beverage%' OR 
                    LOWER(cat.name) LIKE '%drink%' OR 
                    LOWER(cat.name) LIKE '%bar%'
                ))
            `, [o.id]);
            return { ...o, items: items || [], order_type_name: 'DINE-IN' };
        }));

        const [takeawayRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL AS table_number, UPPER(order_status) AS status,
                   customer_name, 'TAKEAWAY' AS order_type_name, 'N/A' AS steward_name, items
            FROM takeaway_orders
            WHERE (order_status IS NULL OR UPPER(order_status) NOT IN (?))
            ORDER BY created_at DESC
        `, [terminalStatuses]);

        const takeawayOrders = takeawayRows.map(o => {
            let parsedItems = [];
            try { parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            const bevItems = parsedItems.filter(i => {
                const catName = (i.category || i.category_name || i.categoryName || '').toLowerCase();
                return catName.includes('beverage') || catName.includes('drink') || catName.includes('bar');
            });
            return { ...o, items: bevItems };
        });

        const [deliveryRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL AS table_number, UPPER(order_status) AS status,
                   customer_name, 'DELIVERY' AS order_type_name, 'Rider' AS steward_name, items
            FROM delivery_orders
            WHERE (order_status IS NULL OR UPPER(order_status) NOT IN (?))
            ORDER BY created_at DESC
        `, [terminalStatuses]);

        const deliveryOrders = deliveryRows.map(o => {
            let parsedItems = [];
            try { parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            const bevItems = parsedItems.filter(i => {
                const catName = (i.category || i.category_name || i.categoryName || '').toLowerCase();
                return catName.includes('beverage') || catName.includes('drink') || catName.includes('bar');
            });
            return { ...o, items: bevItems };
        });

        const allBarOrders = [...dineInOrders, ...takeawayOrders, ...deliveryOrders]
            .filter(o => o.items && o.items.length > 0)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        res.json({ orders: allBarOrders });
    } catch (error) {
        console.error('Bar orders error:', error);
        res.status(500).json({ message: 'Failed to fetch bar orders' });
    }
};

export const updateKitchenOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, type, isBar = false } = req.body;

        let normalized = (status || '').toUpperCase().trim();
        if (normalized === 'READY TO SERVE') normalized = 'READY';

        if (type === 'DINE-IN') {
            const field = isBar ? 'bar_status' : 'kitchen_status';
            await pool.query(`UPDATE orders SET ${field} = ? WHERE id = ?`, [normalized.toLowerCase(), id]);
            
            // Bulk update corresponding items
            if (isBar) {
                await pool.query(`
                    UPDATE order_items 
                    SET item_status = ? 
                    WHERE order_id = ? 
                    AND menu_item_id IN (
                        SELECT mi.id FROM menu_items mi
                        JOIN categories c ON mi.category_id = c.id
                        WHERE LOWER(c.name) LIKE '%beverage%' OR LOWER(c.name) LIKE '%drink%' OR LOWER(c.name) LIKE '%bar%'
                    )
                `, [normalized.toLowerCase(), id]);
            } else {
                await pool.query(`
                    UPDATE order_items 
                    SET item_status = ? 
                    WHERE order_id = ? 
                    AND menu_item_id IN (
                        SELECT mi.id FROM menu_items mi
                        LEFT JOIN categories c ON mi.category_id = c.id
                        WHERE c.name IS NULL OR (LOWER(c.name) NOT LIKE '%beverage%' AND LOWER(c.name) NOT LIKE '%drink%' AND LOWER(c.name) NOT LIKE '%bar%')
                    )
                `, [normalized.toLowerCase(), id]);
            }
            
            // Fetch current statuses and item composition
            const [items] = await pool.query(`
                SELECT COALESCE(cat.name, 'Food') as category 
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ?
            `, [id]);
            
            const isDrink = (cat) => {
                const c = (cat || '').toLowerCase();
                return c.includes('beverage') || c.includes('drink') || c.includes('bar');
            };

            const hasFood = items.some(i => !isDrink(i.category));
            const hasBev = items.some(i => isDrink(i.category));

            // Fetch current station statuses from DB
            const [rows] = await pool.query('SELECT kitchen_status, bar_status FROM orders WHERE id = ?', [id]);
            const { kitchen_status, bar_status } = rows[0];

            const isFoodReady = !hasFood || kitchen_status === 'ready';
            const isBevReady = !hasBev || bar_status === 'ready';

            if (isFoodReady && isBevReady) {
                const [sr] = await pool.query('SELECT id FROM order_statuses WHERE name = "READY_TO_SERVE"');
                if (sr.length > 0) {
                    await pool.query('UPDATE orders SET status_id = ?, main_status = "READY_TO_SERVE" WHERE id = ?', [sr[0].id, id]);
                }
            } else if (kitchen_status === 'preparing' || bar_status === 'preparing' || kitchen_status === 'ready' || bar_status === 'ready') {
                const [sp] = await pool.query('SELECT id FROM order_statuses WHERE name = "PREPARING"');
                if (sp.length > 0) {
                    await pool.query('UPDATE orders SET status_id = ?, main_status = "PREPARING" WHERE id = ?', [sp[0].id, id]);
                }
            }

            // Fetch updated order for socket broadcast
            const [updatedOrder] = await pool.query('SELECT main_status, kitchen_status, bar_status FROM orders WHERE id = ?', [id]);
            const mainStatus = updatedOrder[0]?.main_status || normalized;

            if (global.io) {
                global.io.emit('orderUpdate', { 
                    orderId: id, 
                    id: id,
                    status: mainStatus, 
                    mainStatus: mainStatus,
                    kitchenStatus: updatedOrder[0]?.kitchen_status,
                    barStatus: updatedOrder[0]?.bar_status,
                    updatedBy: isBar ? 'BAR' : 'KITCHEN' 
                });
                global.io.emit('orderStatusUpdated', { 
                    orderId: id, 
                    mainStatus, 
                    kitchenStatus: updatedOrder[0]?.kitchen_status, 
                    barStatus: updatedOrder[0]?.bar_status 
                });
            }
        } else {
            const table = (type || '').toUpperCase() === 'TAKEAWAY' ? 'takeaway_orders' : 'delivery_orders';
            
            // Update items JSON to reflect status
            const [orderRows] = await pool.query(`SELECT items FROM ${table} WHERE id = ?`, [id]);
            if (orderRows.length === 0) return res.status(404).json({ message: 'Order not found' });

            let items = [];
            try {
                items = typeof orderRows[0].items === 'string' ? JSON.parse(orderRows[0].items) : (orderRows[0].items || []);
            } catch (e) { items = []; }
            
            const updatedItems = items.map(item => {
                const itemCat = (item.category || item.category_name || item.categoryName || '').toLowerCase();
                const isDrink = itemCat.includes('beverage') || itemCat.includes('drink') || itemCat.includes('bar');
                
                if ((isBar && isDrink) || (!isBar && !isDrink)) {
                    return { ...item, item_status: normalized.toLowerCase() };
                }
                return item;
            });

            // Decide the OVERALL order status based on all items
            const allItemsReady = updatedItems.every(item => (item.item_status || '').toLowerCase() === 'ready');
            const anyItemInProgress = updatedItems.some(item => 
                (item.item_status || '').toLowerCase() === 'preparing' || 
                (item.item_status || '').toLowerCase() === 'ready'
            );

            let finalOrderStatus = 'pending';
            if (allItemsReady) {
                finalOrderStatus = 'ready';
            } else if (anyItemInProgress) {
                finalOrderStatus = 'preparing';
            } else {
                finalOrderStatus = normalized.toLowerCase();
            }

            // Map for delivery rider
            let finalDeliveryStatus = finalOrderStatus === 'ready' ? 'Accepted' : finalOrderStatus;
            if (finalOrderStatus === 'ready') finalDeliveryStatus = 'Accepted'; // Rider sees it as Accepted for pickup

            await pool.query(`UPDATE ${table} SET items = ?, order_status = ?, delivery_status = ? WHERE id = ?`, 
                [JSON.stringify(updatedItems), finalOrderStatus, finalDeliveryStatus, id]);
            
            if (global.io) {
                global.io.emit('orderUpdate', { 
                    orderId: id, 
                    id: parseInt(id),
                    status: finalOrderStatus, 
                    type: type,
                    updatedBy: isBar ? 'BAR' : 'KITCHEN'
                });
                global.io.emit('delivery_order_updated', { 
                    orderId: id, 
                    id: parseInt(id),
                    status: finalOrderStatus, 
                    delivery_status: finalDeliveryStatus,
                    type: type 
                });
            }
        }

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ message: 'Update failed' });
    }
};

export const getKitchenHistory = async (req, res) => {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED', 'READY_TO_SERVE'];
        const [dineInRows] = await pool.query(`
            SELECT o.id, o.total_price, o.created_at, rt.table_number, COALESCE(os.name, 'COMPLETED') AS status,
                   COALESCE(c.name, o.customer_name, 'Guest') AS customer_name, 'DINE-IN' AS order_type_name
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE UPPER(os.name) IN (?)
            ORDER BY o.created_at DESC
        `, [terminalStatuses]);

        const dineInWithItems = await Promise.all(dineInRows.map(async (order) => {
            const [items] = await pool.query(`
                SELECT mi.name, oi.quantity, cat.name as category 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                JOIN categories cat ON mi.category_id = cat.id 
                WHERE oi.order_id = ? AND LOWER(cat.name) NOT LIKE '%beverage%'
            `, [order.id]);
            return { ...order, items: items || [] };
        }));

        const [takeawayRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL as table_number, order_status as status,
                   customer_name, 'TAKEAWAY' as order_type_name, items
            FROM takeaway_orders
            WHERE UPPER(order_status) IN (?)
            ORDER BY created_at DESC
        `, [terminalStatuses]);

        const takeawayHistory = takeawayRows.map(o => {
            let items = [];
            try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            const foodItems = items.filter(i => !(i.category || '').toLowerCase().includes('beverage'));
            return { ...o, items: foodItems };
        });

        const [deliveryRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL as table_number, order_status as status,
                   customer_name, 'DELIVERY' as order_type_name, items
            FROM delivery_orders
            WHERE UPPER(order_status) IN (?)
            ORDER BY created_at DESC
        `, [terminalStatuses]);

        const deliveryHistory = deliveryRows.map(o => {
            let items = [];
            try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            const foodItems = items.filter(i => !(i.category || '').toLowerCase().includes('beverage'));
            return { ...o, items: foodItems };
        });

        res.json({ history: [...dineInWithItems, ...takeawayHistory, ...deliveryHistory].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch kitchen history' });
    }
};

export const getBarHistory = async (req, res) => {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED', 'READY_TO_SERVE'];
        const [dineInRows] = await pool.query(`
            SELECT o.id, o.total_price, o.created_at, rt.table_number, os.name as status,
                   COALESCE(c.name, o.customer_name, 'Guest') as customer_name, 'DINE-IN' as order_type_name
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE UPPER(os.name) IN (?)
            ORDER BY o.created_at DESC
        `, [terminalStatuses]);

        const dineInHistory = await Promise.all(dineInRows.map(async (order) => {
            const [items] = await pool.query(`
                SELECT mi.name, oi.quantity, cat.name as category 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                JOIN categories cat ON mi.category_id = cat.id 
                WHERE oi.order_id = ? AND LOWER(cat.name) LIKE '%beverage%'
            `, [order.id]);
            return { ...order, items: items || [] };
        }));

        const [takeawayRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL as table_number, order_status as status,
                   customer_name, 'TAKEAWAY' as order_type_name, items
            FROM takeaway_orders
            WHERE UPPER(order_status) IN (?)
        `, [terminalStatuses]);

        const [deliveryRows] = await pool.query(`
            SELECT id, total_price, created_at, NULL as table_number, order_status as status,
                   customer_name, 'DELIVERY' as order_type_name, items
            FROM delivery_orders
            WHERE UPPER(order_status) IN (?)
        `, [terminalStatuses]);

        const otherHistory = [...takeawayRows, ...deliveryRows].map(o => {
            let items = [];
            try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (_) {}
            const bevItems = items.filter(i => (i.category || '').toLowerCase().includes('beverage'));
            return { ...o, items: bevItems };
        });

        res.json({ history: [...dineInHistory, ...otherHistory].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bar history' });
    }
};

export const getDutyStatus = async (req, res) => res.json({ isOnDuty: true });
export const checkIn = async (req, res) => res.json({ success: true });
export const checkOut = async (req, res) => res.json({ success: true });
export const getInventory = async (req, res) => res.json({ inventory: [] });
