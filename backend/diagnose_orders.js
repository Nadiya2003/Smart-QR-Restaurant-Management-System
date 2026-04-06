import pool from './src/config/db.js';

async function diagnose() {
    console.log('--- Terminal Statuses ---');
    const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED', 'READY_TO_SERVE'];
    console.log(terminalStatuses);

    console.log('\n--- Dine-in Orders in DB (Raw) ---');
    const [dineInRaw] = await pool.query(`
        SELECT o.id, o.created_at, os.name as status_name, o.kitchen_status, o.bar_status
        FROM orders o
        LEFT JOIN order_statuses os ON o.status_id = os.id
        ORDER BY o.created_at DESC
        LIMIT 20
    `);
    console.log(JSON.stringify(dineInRaw, null, 2));

    console.log('\n--- Items for Last 5 Dine-in Orders ---');
    for (const o of dineInRaw.slice(0, 5)) {
        const [items] = await pool.query(`
            SELECT oi.id, mi.name, cat.name as category
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            LEFT JOIN categories cat ON mi.category_id = cat.id
            WHERE oi.order_id = ?
        `, [o.id]);
        console.log(`Order #${o.id} Items:`, JSON.stringify(items, null, 2));
    }

    console.log('\n--- Takeaway Orders in DB ---');
    const [takeaway] = await pool.query('SELECT id, order_status, items FROM takeaway_orders LIMIT 5');
    console.log(JSON.stringify(takeaway, null, 2));

    process.exit(0);
}

diagnose();
