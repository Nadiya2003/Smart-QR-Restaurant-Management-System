import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query(`
            SELECT o.id, os.name, (SELECT count(*) FROM order_items WHERE order_id = o.id) as item_cnt
            FROM orders o 
            LEFT JOIN order_statuses os ON o.status_id = os.id 
            WHERE os.name NOT IN ('COMPLETED', 'CANCELLED')
        `);
        console.log('Orders with item counts:');
        rows.forEach(r => console.log(`ID: ${r.id}, Status: ${r.name}, Items: ${r.item_cnt}`));

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
