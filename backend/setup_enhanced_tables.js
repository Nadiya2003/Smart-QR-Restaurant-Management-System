
import pool from './src/config/db.js';

async function setup() {
    try {
        console.log("Starting enhanced database setup...");

        // 1. Staff Permissions Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS staff_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                staff_id INT NOT NULL,
                permission_key VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY(staff_id, permission_key),
                FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
            )
        `);
        console.log("staff_permissions table ensured.");

        // 2. Suppliers Table (Enhanced)
        const [supCols] = await pool.query("SHOW COLUMNS FROM suppliers");
        const supColNames = supCols.map(c => c.Field);
        
        if (!supColNames.includes('contact_number')) {
            await pool.query("ALTER TABLE suppliers ADD COLUMN contact_number VARCHAR(20)");
        }
        if (!supColNames.includes('email')) {
            await pool.query("ALTER TABLE suppliers ADD COLUMN email VARCHAR(150)");
        }
        if (!supColNames.includes('address')) {
            await pool.query("ALTER TABLE suppliers ADD COLUMN address TEXT");
        }
        if (!supColNames.includes('products_supplied')) {
            await pool.query("ALTER TABLE suppliers ADD COLUMN products_supplied TEXT");
        }
        console.log("suppliers table columns ensured.");

        // 3. Inventory Table (Enhanced)
        const [invCols] = await pool.query("SHOW COLUMNS FROM inventory");
        const invColNames = invCols.map(c => c.Field);
        
        if (!invColNames.includes('unit')) {
            await pool.query("ALTER TABLE inventory ADD COLUMN unit VARCHAR(20) DEFAULT 'kg'");
        }
        if (!invColNames.includes('supplier_id')) {
            await pool.query("ALTER TABLE inventory ADD COLUMN supplier_id INT");
            // FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        }
        if (!invColNames.includes('last_updated')) {
            await pool.query("ALTER TABLE inventory ADD COLUMN last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }
        console.log("inventory table columns ensured.");

        // 4. Reports Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_type VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, MONTHLY, HOURLY
                title VARCHAR(255) NOT NULL,
                summary_data JSON NOT NULL,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("reports table ensured.");

        // 5. Seed categories to ensure 6 items (Optional: I'll do this later or guide the user)
        
        console.log("Enhanced database setup complete.");
        process.exit(0);
    } catch (err) {
        console.error("Setup failed:", err);
        process.exit(1);
    }
}

setup();
