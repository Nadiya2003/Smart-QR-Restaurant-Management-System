import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function runMigration() {
    try {
        console.log('🚀 Starting BusinessIQ Foundation Migration...');

        // 1. Ensure menu_items has buying_price
        const [menuCols] = await pool.query("SHOW COLUMNS FROM menu_items LIKE 'buying_price'");
        if (menuCols.length === 0) {
            await pool.query("ALTER TABLE menu_items ADD COLUMN buying_price DECIMAL(10, 2) DEFAULT 0.00 AFTER price");
            console.log('✅ Column buying_price added to menu_items');
        }

        // 2. Ensure order_items has buying_price
        const [oiCols] = await pool.query("SHOW COLUMNS FROM order_items LIKE 'buying_price'");
        if (oiCols.length === 0) {
            await pool.query("ALTER TABLE order_items ADD COLUMN buying_price DECIMAL(10, 2) DEFAULT 0.00 AFTER price");
            console.log('✅ Column buying_price added to order_items');
        }

        // 3. Create order_analytics if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS order_analytics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT,
                order_source VARCHAR(50),
                order_status VARCHAR(50),
                payment_method VARCHAR(50),
                item_id INT,
                item_name VARCHAR(255),
                category_name VARCHAR(100),
                quantity INT,
                unit_price DECIMAL(10, 2),
                total_price DECIMAL(10, 2),
                buying_price DECIMAL(10, 2),
                profit DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ order_analytics table verified/created');

        // 4. Update order_analytics if it exists but is missing columns
        const [oaCols] = await pool.query("SHOW COLUMNS FROM order_analytics");
        const oaFieldNames = oaCols.map(c => c.Field);
        
        if (!oaFieldNames.includes('buying_price')) {
            await pool.query("ALTER TABLE order_analytics ADD COLUMN buying_price DECIMAL(10, 2) DEFAULT 0.00 AFTER total_price");
            console.log('✅ Column buying_price added to order_analytics');
        }
        if (!oaFieldNames.includes('profit')) {
            await pool.query("ALTER TABLE order_analytics ADD COLUMN profit DECIMAL(10, 2) DEFAULT 0.00 AFTER buying_price");
            console.log('✅ Column profit added to order_analytics');
        }
        if (!oaFieldNames.includes('order_status')) {
            await pool.query("ALTER TABLE order_analytics ADD COLUMN order_status VARCHAR(50) DEFAULT 'pending' AFTER order_source");
            console.log('✅ Column order_status ensured in order_analytics');
        }

        // 5. Ensure order_analytics has discount_amount (for detailed reporting)
        if (!oaFieldNames.includes('discount_amount')) {
            await pool.query("ALTER TABLE order_analytics ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER profit");
            console.log('✅ Column discount_amount added to order_analytics');
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
