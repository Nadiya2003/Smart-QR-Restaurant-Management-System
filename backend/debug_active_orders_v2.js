import pool from './src/config/db.js';

async function checkOrders() {
    const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED'];
    
    console.log('--- Terminal Statuses ---');
    console.log(terminalStatuses);

    console.log('\n--- Checking Active Orders ---');
    const [orders] = await pool.query(`
        SELECT o.id, o.kitchen_status, o.bar_status, os.name as status_name
        FROM orders o
        LEFT JOIN order_statuses os ON o.status_id = os.id
        ORDER BY o.created_at DESC
        LIMIT 10
    `);
    console.log(JSON.stringify(orders, null, 2));

    console.log('\n--- Checking Statuses in order_statuses Table ---');
    const [statuses] = await pool.query('SELECT * FROM order_statuses');
    console.log(JSON.stringify(statuses, null, 2));

    process.exit(0);
}

checkOrders();
