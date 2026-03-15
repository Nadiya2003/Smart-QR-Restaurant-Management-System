
import pool from './src/config/db.js';

async function setup() {
    try {
        console.log("Starting Reports System database setup...");

        // 1. Saved Reports Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                summary_data JSON,
                data_json JSON,
                generated_by INT,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (generated_by) REFERENCES staff_users(id) ON DELETE SET NULL
            )
        `);
        console.log("reports table ensured.");

        // 2. Order Analytics Table (Flattened items for easier reporting)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                order_source ENUM('DINE-IN', 'DELIVERY', 'TAKEAWAY') NOT NULL,
                item_id INT NOT NULL,
                item_name VARCHAR(255),
                category_name VARCHAR(100),
                quantity INT DEFAULT 1,
                unit_price DECIMAL(10, 2),
                total_price DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("order_analytics table ensured.");

        // 3. Populate order_analytics from existing delivery/takeaway orders if empty
        const [existingCount] = await pool.query("SELECT COUNT(*) as count FROM order_analytics");
        if (existingCount[0].count === 0) {
            console.log("Populating order_analytics from existing orders...");
            
            // From delivery_orders
            const [delOrders] = await pool.query("SELECT id, items, created_at FROM delivery_orders");
            for (const order of delOrders) {
                try {
                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            await pool.query(
                                "INSERT INTO order_analytics (order_id, order_source, item_id, item_name, category_name, quantity, unit_price, total_price, created_at) VALUES (?, 'DELIVERY', ?, ?, ?, ?, ?, ?, ?)",
                                [order.id, item.id || 0, item.name || item.item_name, item.category || 'General', item.quantity || 1, item.price || 0, (item.price || 0) * (item.quantity || 1), order.created_at]
                            );
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing items for delivery order ${order.id}:`, e.message);
                }
            }

            // From takeaway_orders
            const [takOrders] = await pool.query("SELECT id, items, created_at FROM takeaway_orders");
            for (const order of takOrders) {
                try {
                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            await pool.query(
                                "INSERT INTO order_analytics (order_id, order_source, item_id, item_name, category_name, quantity, unit_price, total_price, created_at) VALUES (?, 'TAKEAWAY', ?, ?, ?, ?, ?, ?, ?)",
                                [order.id, item.id || 0, item.name || item.item_name, item.category || 'General', item.quantity || 1, item.price || 0, (item.price || 0) * (item.quantity || 1), order.created_at]
                            );
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing items for takeaway order ${order.id}:`, e.message);
                }
            }
            console.log("Initial population of order_analytics complete.");
        }

        console.log("Reports System database setup complete.");
        process.exit(0);
    } catch (err) {
        console.error("Setup failed:", err);
        process.exit(1);
    }
}

setup();
