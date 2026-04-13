import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log("Adding guest_count column to orders table...");
        const [rows] = await pool.query("SHOW COLUMNS FROM orders LIKE 'guest_count'");
        if (rows.length === 0) {
            await pool.query("ALTER TABLE orders ADD COLUMN guest_count INT DEFAULT 0");
            console.log("guest_count added.");
        } else {
            console.log("guest_count already exists.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
