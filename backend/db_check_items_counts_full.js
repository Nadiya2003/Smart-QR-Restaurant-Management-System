import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT order_id, count(*) as cnt FROM order_items GROUP BY order_id');
        console.log(JSON.stringify(rows));
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
