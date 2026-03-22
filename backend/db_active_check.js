import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query(`
            SELECT o.id, os.name as status, ot.name as type, o.customer_name, o.table_id
            FROM orders o 
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            WHERE os.name NOT IN ('COMPLETED', 'CANCELLED')
        `);
        console.log('Active Orders in DB:', rows);
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
