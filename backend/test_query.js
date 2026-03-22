import pool from './src/config/db.js';

async function testQuery() {
    try {
        const customerId = 9; // From the user log
        const [deliveryOrders] = await pool.query(
            `SELECT *, 
                    UPPER(order_status) as status, 
                    UPPER(payment_status) as payment_status,
                    "DELIVERY" as type 
             FROM delivery_orders 
             WHERE customer_id = ? 
             ORDER BY created_at DESC`,
            [customerId]
        );
        console.log('QUERY SUCCESS:', deliveryOrders.length, 'orders found');
    } catch (err) {
        console.error('QUERY FAILED:', err.message);
        console.error('SQL:', err.sql);
    } finally {
        process.exit();
    }
}

testQuery();
