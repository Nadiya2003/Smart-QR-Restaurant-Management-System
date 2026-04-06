import pool from './src/config/db.js';
const [rows] = await pool.query('SELECT su.id, su.full_name, su.email, su.status, sr.role_name FROM staff_users su JOIN staff_roles sr ON su.role_id = sr.id');
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
