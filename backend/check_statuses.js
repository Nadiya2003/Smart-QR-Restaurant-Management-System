import pool from './src/config/db.js';
async function test() {
    try {
        const [rows] = await pool.query('SELECT * FROM order_statuses');
        console.log('Order Statuses:', JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
