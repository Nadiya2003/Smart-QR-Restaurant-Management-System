import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.log('--- Tables ---');
        console.log(rows);
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
