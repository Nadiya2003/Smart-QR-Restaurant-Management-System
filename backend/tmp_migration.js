import pool from './src/config/db.js';

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS restaurant_feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NULL,
                order_id INT NULL,
                meal_rating INT,
                service_rating INT,
                comment TEXT,
                is_complaint TINYINT UNSIGNED DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ restaurant_feedbacks table ready.');

        // 2. Add loyalty_points to stewards if missing
        try {
            await pool.query("ALTER TABLE stewards ADD COLUMN loyalty_points INT DEFAULT 0");
            console.log('✅ Added loyalty_points to stewards.');
        } catch (e) {
            // Probably already exists
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
