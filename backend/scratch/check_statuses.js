import pool from '../src/config/db.js';
const [rows] = await pool.query('SELECT * FROM order_statuses');
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
