
import pool from '../config/db.js';

async function setupMenu() {
    try {
        console.log("Checking categories and menu_items...");
        
        // 1. Categories (Ensure image column exists)
        const [catCols] = await pool.query("SHOW COLUMNS FROM categories");
        const catColNames = catCols.map(c => c.Field);
        if (!catColNames.includes('image')) {
            await pool.query("ALTER TABLE categories ADD COLUMN image VARCHAR(255)");
            console.log("Added image column to categories.");
        }

        // 2. Menu Items
        await pool.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                image VARCHAR(255),
                tags JSON DEFAULT NULL, -- Store tags as a JSON array
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            )
        `);
        console.log("menu_items table ensured.");

        // Check for tags column if table already existed
        const [menuCols] = await pool.query("SHOW COLUMNS FROM menu_items");
        const menuColNames = menuCols.map(c => c.Field);
        if (!menuColNames.includes('tags')) {
            await pool.query("ALTER TABLE menu_items ADD COLUMN tags JSON DEFAULT NULL");
            console.log("Added tags column to menu_items.");
        }

        console.log("Menu setup complete.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
setupMenu();
