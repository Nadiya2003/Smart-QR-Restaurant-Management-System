import pool from './src/config/db.js';

async function simBarApi() {
    try {
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED', 'READY_TO_SERVE'];
        
        const [dineInRows] = await pool.query(`
            SELECT o.id, os.name as status, o.bar_status
            FROM orders o
            LEFT JOIN order_statuses os ON o.status_id = os.id
            WHERE (os.name IS NULL OR UPPER(os.name) NOT IN (?))
        `, [terminalStatuses]);

        const processed = await Promise.all(dineInRows.map(async (o) => {
            const [items] = await pool.query(`
                SELECT oi.id, mi.name, cat.name as category
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ? AND (cat.name IS NOT NULL AND LOWER(cat.name) LIKE '%beverage%')
            `, [o.id]);
            return { ...o, items: items || [] };
        }));

        console.log('Final Bar Orders:', JSON.stringify(processed.filter(o => o.items.length > 0), null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

simBarApi();
