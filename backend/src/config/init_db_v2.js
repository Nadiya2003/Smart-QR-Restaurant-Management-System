
import pool from '../config/db.js';

async function initTables() {
    try {
        console.log("Starting Database Initialization...");

        // 1. Categories
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                image VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Permissions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Role Permissions bridge table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INT NOT NULL,
                permission_id INT NOT NULL,
                PRIMARY KEY (role_id, permission_id),
                FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            )
        `);

        // 3. Staff Attendance
        await pool.query(`
            CREATE TABLE IF NOT EXISTS staff_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                staff_id INT NOT NULL,
                date DATE NOT NULL,
                login_time DATETIME NOT NULL,
                logout_time DATETIME,
                status ENUM('PRESENT', 'ABSENT', 'LATE') DEFAULT 'PRESENT',
                FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
            )
        `);

        // 4. Inventory
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                quantity DECIMAL(10, 2) DEFAULT 0.00,
                unit VARCHAR(50), -- e.g., kg, liters, units
                low_stock_threshold DECIMAL(10, 2) DEFAULT 10.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 5. Suppliers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                contact_person VARCHAR(255),
                phone VARCHAR(20),
                email VARCHAR(150),
                address TEXT,
                product_category VARCHAR(100),
                status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        // 6. Supplier Orders
        await pool.query(`
            CREATE TABLE IF NOT EXISTS supplier_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_id INT NOT NULL,
                order_date DATE DEFAULT (CURRENT_DATE),
                total_amount DECIMAL(10, 2) NOT NULL,
                status ENUM('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING',
                notes TEXT,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
            )
        `);

        // 7. Supplier Payments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS supplier_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_order_id INT NOT NULL,
                payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(50),
                transaction_id VARCHAR(100),
                FOREIGN KEY (supplier_order_id) REFERENCES supplier_orders(id) ON DELETE CASCADE
            )
        `);

        // 8. Notifications
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT, -- NULL for group
                role_id INT, -- NULL if not for role
                target_audience ENUM('Staff', 'Customers', 'All') DEFAULT 'All',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type ENUM('INFO', 'ORDER', 'FEEDBACK', 'COMPLAINT', 'SUPPLIER', 'INVENTORY') DEFAULT 'INFO',
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        // Insert default permissions if empty
        const [permCount] = await pool.query("SELECT COUNT(*) as count FROM permissions");
        if (permCount[0].count === 0) {
            const defaultPerms = [
                ['View Orders', 'Can see all order lists'],
                ['Manage Orders', 'Can update order status'],
                ['Cancel Orders', 'Can cancel any order'],
                ['Manage Menu', 'Can add/edit/delete menu items'],
                ['Manage Inventory', 'Can update stock levels'],
                ['View Reports', 'Access to sales and performance reports'],
                ['Supplier Payments', 'Can manage supplier orders and payments'],
                ['Attendance Access', 'Can view staff attendance records']
            ];
            await pool.query("INSERT INTO permissions (name, description) VALUES ?", [defaultPerms]);
            console.log("Default permissions inserted.");
        }

        console.log("Database tables initialized successfully.");
    } catch (error) {
        console.error("Database initialization error:", error);
    } finally {
        process.exit();
    }
}

initTables();
