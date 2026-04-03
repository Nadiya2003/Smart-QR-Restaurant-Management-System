
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Nmk@6604',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

async function migrate() {
    try {
        console.log("Checking and updating order statuses...");
        // 1. Ensure required statuses exist
        const required = ['PLACED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'COMPLETED', 'CANCELLED'];
        for (const name of required) {
            const [rows] = await pool.query("SELECT id FROM order_statuses WHERE name = ?", [name]);
            if (rows.length === 0) {
                await pool.query("INSERT INTO order_statuses (name) VALUES (?)", [name]);
                console.log(`Added status: ${name}`);
            }
        }

        // 2. Add split status columns to orders
        console.log("Adding split status columns to orders...");
        const [cols] = await pool.query("SHOW COLUMNS FROM orders");
        const fields = cols.map(c => c.Field);

        if (!fields.includes('kitchen_status')) {
            await pool.query("ALTER TABLE orders ADD COLUMN kitchen_status VARCHAR(50) DEFAULT 'pending'");
        }
        if (!fields.includes('bar_status')) {
            await pool.query("ALTER TABLE orders ADD COLUMN bar_status VARCHAR(50) DEFAULT 'pending'");
        }
        if (!fields.includes('main_status')) {
             await pool.query("ALTER TABLE orders ADD COLUMN main_status VARCHAR(50) DEFAULT 'PLACED'");
        }

        // 3. Update existing orders to have sane defaults if needed
        await pool.query("UPDATE orders SET kitchen_status = 'ready' WHERE kitchen_status IS NULL");
        await pool.query("UPDATE orders SET bar_status = 'ready' WHERE bar_status IS NULL");

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
