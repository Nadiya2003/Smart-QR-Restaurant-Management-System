import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SELECT items FROM takeaway_orders WHERE id = 18');
        console.log('--- Items for Takeaway 18 ---');
        console.log(rows[0]?.items);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
