import mysql from 'mysql2/promise';

async function setupDatabase() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Nmk@6604',
        database: 'smart_qr_restaurant',
        multipleStatements: true
    });

    try {
        console.log('Starting Database Updates...');

        // 1. Ensure restaurant_tables has status types
        // (Existing table restaurant_tables: id, area_id, table_number, capacity, location, status, created_at, updated_at)
        
        // 2. Create order_items if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                price DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('- order_items table ready.');

        // 3. Update orders table
        // Existing: id, customer_id, steward_id, order_type_id, status_id, payment_method_id, payment_status_id, created_at, updated_at, cancellation_reason
        const [ordersCols] = await connection.query('DESCRIBE orders');
        const colNames = ordersCols.map(c => c.Field);
        
        if (!colNames.includes('table_id')) {
            await connection.query('ALTER TABLE orders ADD COLUMN table_id INT AFTER customer_id');
        }
        if (!colNames.includes('total_price')) {
            await connection.query('ALTER TABLE orders ADD COLUMN total_price DECIMAL(10, 2) DEFAULT 0.00 AFTER table_id');
        }
        console.log('- orders table updated.');

        // 4. Create cancel_requests
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cancel_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                requested_by INT NOT NULL,
                reason TEXT,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                approved_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('- cancel_requests table ready.');

        // 5. Update notifications
        const [notifCols] = await connection.query('DESCRIBE notifications');
        const notifColNames = notifCols.map(c => c.Field);
        if (!notifColNames.includes('type')) {
            await connection.query('ALTER TABLE notifications ADD COLUMN type VARCHAR(50) DEFAULT "general" AFTER message');
        }
        if (!notifColNames.includes('status')) {
            await connection.query('ALTER TABLE notifications ADD COLUMN status ENUM("unread", "read") DEFAULT "unread" AFTER type');
        }
        console.log('- notifications table ready.');

        // 6. Ensure order_statuses has all required values
        const requiredStatuses = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
        for (const s of requiredStatuses) {
            await connection.query('INSERT IGNORE INTO order_statuses (name) VALUES (?)', [s]);
        }
        console.log('- order_statuses populated.');

        console.log('Database Updates Completed Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Database Setup Error:', error);
        process.exit(1);
    }
}

setupDatabase();
