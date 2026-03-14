
import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT * FROM order_statuses');
        console.log(JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
