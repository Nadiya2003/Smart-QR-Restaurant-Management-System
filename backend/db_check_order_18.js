import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT * FROM orders WHERE id = 18');
        console.log('--- Order 18 (orders) ---');
        console.log(rows[0]);
        
        const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = 18');
        console.log('--- Order Items for 18 ---');
        console.log(items);

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
