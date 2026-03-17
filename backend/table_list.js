import pool from './src/config/db.js';

async function list() {
    const [rows] = await pool.query('SHOW TABLES');
    console.log(rows.map(r => Object.values(r)[0]));
    process.exit(0);
}
list();
