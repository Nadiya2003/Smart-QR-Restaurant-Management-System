import pool from './src/config/db.js';

async function checkOrders() {
    const [orders] = await pool.query(`
        SELECT o.id, o.kitchen_status, o.bar_status, os.name as status_name
        FROM orders o
        LEFT JOIN order_statuses os ON o.status_id = os.id
        ORDER BY o.created_at DESC
        LIMIT 20
    `);
    orders.forEach(o => console.log(`ID: ${o.id}, K: ${o.kitchen_status}, B: ${o.bar_status}, STATUS: ${o.status_name}`));

    const [t_orders] = await pool.query(`SELECT id, order_status FROM takeaway_orders ORDER BY created_at DESC LIMIT 5`);
    t_orders.forEach(o => console.log(`Takeaway ID: ${o.id}, STATUS: ${o.order_status}`));

    process.exit(0);
}

checkOrders();
