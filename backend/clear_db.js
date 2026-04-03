import pool from './src/config/db.js';

async function clearDB() {
    try {
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('TRUNCATE TABLE order_items');
        await pool.query('TRUNCATE TABLE orders');
        await pool.query('TRUNCATE TABLE takeaway_orders');
        await pool.query('TRUNCATE TABLE delivery_order_items');
        await pool.query('TRUNCATE TABLE delivery_orders');
        await pool.query('TRUNCATE TABLE cancel_requests');
        await pool.query("UPDATE restaurant_tables SET status = 'available'");
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Successfully cleared all orders and reset tables');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

clearDB();
