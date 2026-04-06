import pool from './src/config/db.js';
const [rows] = await pool.query('SELECT name FROM order_statuses');
console.log(rows.map(r => r.name));
process.exit(0);
