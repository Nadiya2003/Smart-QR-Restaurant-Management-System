import pool from './src/config/db.js';

async function check() {
    try {
        const [orders] = await pool.query('DESCRIBE orders');
        console.log('--- ORDERS TABLE ---');
        console.log(JSON.stringify(orders, null, 2));

        const [stewards] = await pool.query('DESCRIBE stewards');
        console.log('--- STEWARDS TABLE ---');
        console.log(JSON.stringify(stewards, null, 2));

        const [statuses] = await pool.query('SELECT * FROM order_statuses');
        console.log('--- ORDER STATUSES ---');
        console.log(JSON.stringify(statuses, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
