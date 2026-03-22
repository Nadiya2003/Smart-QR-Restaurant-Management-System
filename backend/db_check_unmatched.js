import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT count(*) as cnt FROM orders WHERE status_id IS NULL');
        console.log('Orders with NULL status:', rows[0].cnt);
        
        const [rows2] = await pool.query('SELECT o.id, o.status_id, os.name FROM orders o LEFT JOIN order_statuses os ON o.status_id = os.id WHERE os.name IS NULL LIMIT 10');
        console.log('Sample orders with unmatched status:', rows2);

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
