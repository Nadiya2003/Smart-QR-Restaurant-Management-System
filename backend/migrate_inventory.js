import pool from './src/config/db.js';

async function migrate() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting Inventory Migration...');
        await connection.beginTransaction();

        // 1. Create restock_requests table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS restock_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_id INT NOT NULL,
                supplier_id INT NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'REJECTED', 'SENT_TO_SUPPLIER', 'COMPLETED') DEFAULT 'PENDING',
                requested_by INT,
                approved_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )
        `);

        // 2. Create stock_history table if not exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS stock_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_id INT NOT NULL,
                action_type ENUM('ADD', 'REDUCE', 'RESTOCK', 'ADJUST') NOT NULL,
                quantity DECIMAL(10,2) NOT NULL,
                reason VARCHAR(255),
                performed_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
            )
        `);

        // 3. Update inventory table
        // First check columns
        const [columns] = await connection.query('SHOW COLUMNS FROM inventory');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('supplier_id')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN supplier_id INT NULL');
            await connection.query('ALTER TABLE inventory ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id)');
        }

        if (!columnNames.includes('status')) {
            await connection.query("ALTER TABLE inventory ADD COLUMN status ENUM('Available', 'Low Stock', 'Out of Stock') DEFAULT 'Available'");
        }

        if (!columnNames.includes('updated_at')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        }

        // Add item_name if it doesn't exist (currently linked to menu_items, but prompt says "Item Name")
        // Mapping: inventory.menu_item_id -> menu_items.name
        // However, user might want standalone inventory items too. 
        // Let's stick to the current link but allow NULL menu_item_id for general items if needed.
        await connection.query('ALTER TABLE inventory MODIFY COLUMN menu_item_id INT NULL');
        if (!columnNames.includes('item_name')) {
            await connection.query('ALTER TABLE inventory ADD COLUMN item_name VARCHAR(100) NULL');
        }
        if (!columnNames.includes('category')) {
            await connection.query("ALTER TABLE inventory ADD COLUMN category ENUM('Kitchen', 'Bar', 'General') DEFAULT 'General'");
        }

        await connection.commit();
        console.log('✅ Inventory Migration Successful!');
        process.exit(0);
    } catch (error) {
        await connection.rollback();
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
