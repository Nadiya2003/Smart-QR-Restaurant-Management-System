import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('password', 10);
await pool.query('UPDATE staff_users SET password = ? WHERE email = ?', [hash, 'steward@test.com']);
console.log('Password updated for steward@test.com');
process.exit(0);
