import pool from './src/config/db.js';

async function simulateApi() {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED', 'READY_TO_SERVE'];

        console.log('--- Simulating getKitchenOrders ---');
        
        const [dineInRows] = await pool.query(`
            SELECT 
                o.id,
                o.status_id,
                os.name AS status,
                o.kitchen_status
            FROM orders o
            LEFT JOIN order_statuses os ON o.status_id = os.id
            WHERE (os.name IS NULL OR UPPER(os.name) NOT IN (?))
        `, [terminalStatuses]);

        const processed = await Promise.all(dineInRows.map(async (order) => {
            const [items] = await pool.query(`
                SELECT oi.id, mi.name, cat.name as category
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ?
                  AND (cat.name IS NULL OR LOWER(cat.name) NOT LIKE '%beverage%')
            `, [order.id]);
            return { ...order, items: items || [] };
        }));

        const filtered = processed.filter(o => o.items && o.items.length > 0);
        
        console.log('Final Filtered Orders for Kitchen:', JSON.stringify(filtered, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

simulateApi();
