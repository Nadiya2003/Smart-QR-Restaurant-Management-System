import pool from './src/config/db.js';

async function verify() {
    try {
        const [rows] = await pool.query('DESCRIBE delivery_orders');
        const fields = rows.map(r => r.Field);
        console.log('HAS_ORDER_STATUS:' + fields.includes('order_status'));
        console.log('HAS_CUSTOMER_ID:' + fields.includes('customer_id'));
        console.log('ALL_FIELDS:' + fields.join(','));
    } catch (err) {
        console.error('Verify failed:', err.message);
    } finally {
        process.exit();
    }
}

verify();
