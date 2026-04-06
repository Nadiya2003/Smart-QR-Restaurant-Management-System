import pool from './src/config/db.js';

async function checkData() {
    try {
        console.log('--- Database Config Debug ---');
        console.log('Host:', process.env.DB_HOST || 'localhost');
        console.log('DB Name:', process.env.DB_NAME || 'smart_qr_restaurant');

        console.log('--- Order Statuses ---');
        const [statuses] = await pool.query('SELECT * FROM order_statuses');
        console.log(statuses);

        console.log('--- Categories ---');
        const [cats] = await pool.query('SELECT name FROM categories');
        console.log(cats);

        console.log('--- Active Orders (Non-Terminal) ---');
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED', 'SERVED', 'READY_TO_SERVE'];
        const [orders] = await pool.query(`
            SELECT o.id, os.name as status
            FROM orders o
            LEFT JOIN order_statuses os ON o.status_id = os.id
            WHERE os.name IS NULL OR os.name NOT IN (?)
        `, [terminalStatuses]);
        console.log(orders);

        if (orders.length > 0) {
            console.log('--- Items for first active order ---');
            const [items] = await pool.query(`
                SELECT oi.id, mi.name, cat.name as cat_name
                FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                LEFT JOIN categories cat ON mi.category_id = cat.id
                WHERE oi.order_id = ?
            `, [orders[0].id]);
            console.log(items);
        } else {
            console.log('NO ACTIVE ORDERS FOUND IN DATABASE');
        }

        process.exit(0);
    } catch (err) {
        console.error('DIAG ERROR:', err);
        process.exit(1);
    }
}

checkData();
