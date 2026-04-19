import pool from './config/db.js';

async function migrate() {
    try {
        await pool.query("ALTER TABLE delivery_orders ADD COLUMN delivery_time TIME AFTER address;");
        console.log("Success");
    } catch(e) {
        console.log(e.message);
    }
    process.exit(0);
}
migrate();
