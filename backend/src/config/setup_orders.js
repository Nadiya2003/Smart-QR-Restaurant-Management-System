
import pool from '../config/db.js';

async function setupOrders() {
    try {
        console.log("Setting up order statuses and cancellation fields...");

        // 1. Ensure order_statuses
        const statuses = ['ORDER PLACED', 'PREPARING', 'READY', 'OUT FOR DELIVERY', 'COMPLETED', 'CANCELLED'];
        for (const s of statuses) {
            await pool.query("INSERT IGNORE INTO order_statuses (name) VALUES (?)", [s]);
        }
        console.log("Order statuses ensured.");

        // 2. Add cancellation_reason to order tables
        const tables = ['orders', 'delivery_orders', 'takeaway_orders'];
        for (const table of tables) {
            const [cols] = await pool.query(`SHOW COLUMNS FROM ${table}`);
            const colNames = cols.map(c => c.Field);
            if (!colNames.includes('cancellation_reason')) {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN cancellation_reason TEXT`);
                console.log(`Added cancellation_reason to ${table}.`);
            }
        }

        console.log("Order setup complete.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
setupOrders();
