import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query(`
            SELECT o.id, os.name as status
            FROM orders o 
            LEFT JOIN order_statuses os ON o.status_id = os.id
            WHERE os.name NOT IN ('COMPLETED', 'CANCELLED')
        `);
        console.log('Active Order IDs:', rows.map(r => r.id));
        console.log('Total Active Count:', rows.length);

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
