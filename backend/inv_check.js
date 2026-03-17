import pool from './src/config/db.js';

async function checkInv() {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory LIMIT 1');
        console.log('Sample Inventory Item:', JSON.stringify(rows[0], null, 2));
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
checkInv();
