import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('DESCRIBE orders');
        console.log(JSON.stringify(rows.map(r => r.Field), null, 2));
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
