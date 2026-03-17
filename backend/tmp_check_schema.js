import pool from './src/config/db.js';

async function check() {
    try {
        const [rows1] = await pool.query('DESCRIBE staff_attendance');
        console.log('staff_attendance:', rows1.map(r => r.Field).join(', '));
        
        const [rows2] = await pool.query('DESCRIBE orders');
        console.log('orders:', rows2.map(r => r.Field).join(', '));
        
        const [rows3] = await pool.query('SHOW TABLES');
        console.log('tables:', rows3.map(r => Object.values(r)[0]).join(', '));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
