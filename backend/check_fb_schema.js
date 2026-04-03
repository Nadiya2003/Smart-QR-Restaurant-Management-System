
import pool from './src/config/db.js';

async function check() {
    try {
        console.log('--- order_statuses ---');
        const [rows] = await pool.query('SELECT * FROM order_statuses');
        console.log(rows);
                        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
