import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log("Checking for needed_time column in orders table...");
        const [rows] = await pool.query("SHOW COLUMNS FROM orders LIKE 'needed_time'");
        if (rows.length === 0) {
            console.log("Adding needed_time column to orders table...");
            await pool.query("ALTER TABLE orders ADD COLUMN needed_time VARCHAR(255) NULL");
            console.log("Column added successfully.");
        } else {
            console.log("Column already exists.");
        }

        console.log("Checking for needed_time column in takeaway_orders table...");
        const [tRows] = await pool.query("SHOW COLUMNS FROM takeaway_orders LIKE 'needed_time'");
        if (tRows.length === 0) {
            await pool.query("ALTER TABLE takeaway_orders ADD COLUMN needed_time VARCHAR(255) NULL");
        }

        console.log("Checking for needed_time column in delivery_orders table...");
        const [dRows] = await pool.query("SHOW COLUMNS FROM delivery_orders LIKE 'needed_time'");
        if (dRows.length === 0) {
            await pool.query("ALTER TABLE delivery_orders ADD COLUMN needed_time VARCHAR(255) NULL");
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
