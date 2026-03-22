import pool from './src/config/db.js';

async function check() {
    try {
        const query = `
            SELECT o.id, os.name as status
            FROM orders o
            LEFT JOIN order_statuses os ON o.status_id = os.id
            WHERE UPPER(os.name) NOT IN ('COMPLETED', 'CANCELLED')
        `;
        const [rows] = await pool.query(query);
        console.log('Result of Kitchen Query:', rows);

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

check();
