import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        console.log(JSON.stringify(tables, null, 2));
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
