import pool from './src/config/db.js';

async function checkColumns() {
    try {
        const [delCols] = await pool.query('DESCRIBE delivery_orders');
        console.log('DELIVERY_ORDER_COLS:' + delCols.map(c => c.Field).join('|'));
        const [takeCols] = await pool.query('DESCRIBE takeaway_orders');
        console.log('TAKEAWAY_ORDER_COLS:' + takeCols.map(c => c.Field).join('|'));
    } catch (err) {
        process.stdout.write('DB_ERROR:' + err.message);
    } finally {
        process.exit();
    }
}

checkColumns();
