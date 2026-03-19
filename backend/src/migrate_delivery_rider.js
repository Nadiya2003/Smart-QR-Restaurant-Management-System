import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'smart_qr_restaurant'
    });

    try {
        console.log('--- RUNNING DELIVERY RIDER SYSTEM MIGRATION ---');

        await connection.query(`SET FOREIGN_KEY_CHECKS = 0`);

        // 1. DELIVERY_ORDERS Table
        // We drop and re-create if it doesn't match well, but better just re-create it correctly.
        await connection.query(`DROP TABLE IF EXISTS delivery_order_items`);
        await connection.query(`DROP TABLE IF EXISTS cancel_requests`);
        await connection.query(`DROP TABLE IF EXISTS delivery_orders`);

        console.log('Creating delivery_orders table...');
        await connection.query(`
            CREATE TABLE delivery_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                address TEXT NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                order_type ENUM('online', 'rider') DEFAULT 'rider',
                status ENUM('Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered') DEFAULT 'Pending',
                payment_status ENUM('Unpaid', 'Paid', 'Cash on Delivery') DEFAULT 'Unpaid',
                total_price DECIMAL(10, 2) DEFAULT 0,
                created_by INT, -- Rider ID
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL
            )
        `);

        // 2. DELIVERY_ORDER_ITEMS Table
        console.log('Creating delivery_order_items table...');
        await connection.query(`
            CREATE TABLE delivery_order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                notes TEXT,
                FOREIGN KEY (order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
            )
        `);

        // 3. CANCEL_REQUESTS Table
        console.log('Creating cancel_requests table...');
        await connection.query(`
            CREATE TABLE cancel_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                requested_by INT NOT NULL,
                reason TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES staff_users(id)
            )
        `);

        // 4. ATTENDANCE Table (or ensure staff_attendance exists)
        // Let's use staff_attendance if it exists, or create 'attendance'
        console.log('Ensuring staff_attendance table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                check_in DATETIME NOT NULL,
                check_out DATETIME DEFAULT NULL,
                date DATE NOT NULL,
                status ENUM('PRESENT', 'ABSENT', 'LATE', 'LEAVE') DEFAULT 'PRESENT',
                FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE CASCADE
            )
        `);

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.query(`SET FOREIGN_KEY_CHECKS = 1`);
        await connection.end();
    }
}

runMigration();
