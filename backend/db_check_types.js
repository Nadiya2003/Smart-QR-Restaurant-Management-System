import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT * FROM order_types');
        console.log('--- Order Types ---');
        rows.forEach(r => console.log(`${r.id}: ${r.name}`));
        
        const [orders] = await pool.query('SELECT id, status_id, order_type_id FROM orders LIMIT 5');
        console.log('--- Orders Sample ---');
        orders.forEach(o => console.log(`ID: ${o.id}, Status: ${o.status_id}, TypeID: ${o.order_type_id}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
