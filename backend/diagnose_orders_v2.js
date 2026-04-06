import pool from './src/config/db.js';

async function diagnose() {
    console.log('\n--- Dine-in Raw ---');
    const [dineIn] = await pool.query('SELECT id, status_id FROM orders ORDER BY created_at DESC LIMIT 5');
    console.log(dineIn);

    console.log('\n--- Last 5 Items ---');
    const [items] = await pool.query(`
        SELECT oi.order_id, mi.name, cat.name as category
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        LEFT JOIN categories cat ON mi.category_id = cat.id
        ORDER BY oi.id DESC LIMIT 10
    `);
    console.log(items);

    process.exit(0);
}

diagnose();
