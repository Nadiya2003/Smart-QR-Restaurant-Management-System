import pool from './src/config/db.js';

async function check() {
    try {
        const [rows] = await pool.query("DESCRIBE orders");
        console.log("ORDERS SCHEMA:", JSON.stringify(rows));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
