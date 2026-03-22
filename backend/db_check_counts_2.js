import pool from './src/config/db.js';

async function check() {
    try {
        const [orders] = await pool.query(`SELECT os.name, count(*) as cnt FROM orders o LEFT JOIN order_statuses os ON o.status_id = os.id GROUP BY os.name`);
        console.log('Orders table:', orders);
        
        const [takeaway] = await pool.query(`SELECT order_status, count(*) as cnt FROM takeaway_orders GROUP BY order_status`);
        console.log('Takeaway table:', takeaway);
        
        const [delivery] = await pool.query(`SELECT order_status, count(*) as cnt FROM delivery_orders GROUP BY order_status`);
        console.log('Delivery table:', delivery);

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
