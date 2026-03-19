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
        console.log('--- RUNNING SUPPLIER SYSTEM MIGRATION ---');

        // 1. Alter supplier_staff if needed
        const [colsStaff] = await connection.query("SHOW COLUMNS FROM supplier_staff LIKE 'supplier_id'");
        if (colsStaff.length === 0) {
            console.log('Adding supplier_id to supplier_staff...');
            await connection.query("ALTER TABLE supplier_staff ADD COLUMN supplier_id INT");
            await connection.query("ALTER TABLE supplier_staff ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL");
        }

        // 2. Assign inventory items to suppliers
        console.log('Assigning inventory items to suppliers...');
        await connection.query("UPDATE inventory SET supplier_id = 1 WHERE item_name IN ('Potatoes (Local)', 'Red Onions', 'Garlic (Peeled)', 'Ginger Whole')");
        await connection.query("UPDATE inventory SET supplier_id = 3 WHERE item_name IN ('Milk', 'Butter', 'Fresh Eggs (Large)')");
        await connection.query("UPDATE inventory SET supplier_id = 2 WHERE item_name IN ('Tiger Prawns Jumbo', 'Sea Bass Fillet')");
        await connection.query("UPDATE inventory SET supplier_id = 5 WHERE item_name IN ('Coca Cola 500ml', 'Sprite 500ml', 'Mineral Water 1L')");

        // 3. Supplier Requests table
        console.log('Ensuring supplier_requests table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS supplier_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_id INT NOT NULL,
                inventory_id INT NOT NULL,
                quantity DECIMAL(10, 2) NOT NULL,
                message TEXT,
                status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
            )
        `);

        // 4. Alter supplier_orders if needed
        const [colsOrders] = await connection.query("SHOW COLUMNS FROM supplier_orders LIKE 'priority'");
        if (colsOrders.length === 0) {
            console.log('Adding priority to supplier_orders...');
            await connection.query("ALTER TABLE supplier_orders ADD COLUMN priority ENUM('Normal', 'Urgent') DEFAULT 'Normal'");
        }

        // 5. Supplier History
        console.log('Ensuring supplier_history table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS supplier_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_id INT NOT NULL,
                inventory_id INT NOT NULL,
                quantity DECIMAL(10, 2) NOT NULL,
                delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                order_id INT,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
                FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
            )
        `);

        // 6. Create Test Supplier Staff User
        const [exStaff] = await connection.query("SELECT id FROM staff_users WHERE email = 'supplier@restaurant.com'");
        if (exStaff.length === 0) {
            console.log('Creating test supplier user...');
            const [roleRows] = await connection.query("SELECT id FROM staff_roles WHERE role_name = 'supplier'");
            const roleId = roleRows[0].id;
            
            // Hash password 'Nmk@6604'
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.default.hash('Nmk@6604', 10);
            
            const [staffResult] = await connection.query(
                "INSERT INTO staff_users (full_name, email, phone, role_id, password, is_active) VALUES (?, ?, ?, ?, ?, 1)",
                ['Supplier User', 'supplier@restaurant.com', '0777777777', roleId, hashedPassword]
            );
            
            const staffId = staffResult.insertId;
            
            // Link to supplier brand (e.g., Fresh Mart = 1)
            await connection.query(
                "INSERT INTO supplier_staff (staff_id, supplier_id, company_name) VALUES (?, ?, ?)",
                [staffId, 1, 'Fresh Mart Pvt Ltd']
            );
        }

        console.log('Supplier Migration Completed Successfully!');
    } catch (err) {
        console.error('Supplier Migration Failed:', err);
    } finally {
        await connection.end();
    }
}

runMigration();
