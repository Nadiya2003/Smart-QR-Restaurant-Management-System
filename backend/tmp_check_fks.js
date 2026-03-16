import pool from './src/config/db.js';
async function check() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM orders");
        console.log('Orders Columns:', rows.map(r => r.Field).join(', '));
        const [requests] = await pool.query("SHOW TABLES LIKE 'cancel_requests'");
        console.log('Cancel Requests exists:', requests.length > 0);
        if (requests.length > 0) {
            const [cols] = await pool.query("SHOW COLUMNS FROM cancel_requests");
            console.log('Cancel Requests Columns:', cols.map(c => c.Field).join(', '));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
