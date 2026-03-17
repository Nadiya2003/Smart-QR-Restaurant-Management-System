import pool from './src/config/db.js';

async function migrate() {
    const connection = await pool.getConnection();
    try {
        console.log('--- STARTING INVENTORY v2 MIGRATION ---');
        await connection.beginTransaction();

        // 1. Ensure Suppliers table matches requirements
        await connection.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                brand_name VARCHAR(100) NOT NULL,
                contact_name VARCHAR(100),
                email VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Ensure Inventory table exists and has all required columns
        // We use a safe columns check
        const [invColumns] = await connection.query('SHOW COLUMNS FROM inventory');
        const colMap = invColumns.reduce((acc, col) => ({ ...acc, [col.Field]: col }), {});

        if (!colMap['item_name']) {
            await connection.query('ALTER TABLE inventory ADD COLUMN item_name VARCHAR(100) NOT NULL');
        }
        if (!colMap['category']) {
            await connection.query("ALTER TABLE inventory ADD COLUMN category ENUM('Kitchen', 'Bar', 'General') DEFAULT 'General'");
        }
        if (!colMap['supplier_id']) {
            await connection.query('ALTER TABLE inventory ADD COLUMN supplier_id INT NULL');
            await connection.query('ALTER TABLE inventory ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL');
        }
        if (!colMap['status']) {
            await connection.query("ALTER TABLE inventory ADD COLUMN status ENUM('Available', 'Low Stock', 'Out of Stock') DEFAULT 'Available'");
        }
        if (!colMap['min_level']) {
            await connection.query('ALTER TABLE inventory ADD COLUMN min_level INT DEFAULT 5');
        }

        // 3. Create restock_requests table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS restock_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_id INT NOT NULL,
                supplier_id INT NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'SENT_TO_SUPPLIER', 'COMPLETED') DEFAULT 'PENDING',
                requested_by INT, -- staff_id
                approved_by INT, -- staff_id
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
            )
        `);

        // 4. Create stock_history table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS stock_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_id INT NOT NULL,
                action_type ENUM('ADD', 'REDUCE', 'RESTOCK', 'ADJUST') NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                reason VARCHAR(255),
                performed_by INT, -- staff_id
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
            )
        `);

        await connection.commit();
        console.log('✅ Inventory v2 Migration Successful!');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
