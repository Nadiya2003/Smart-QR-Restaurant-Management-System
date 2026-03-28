
import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log('--- Ensuring Feedback Tables ---');
        
        // 1. Generic Feedback Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NULL,
                steward_id INT NULL,
                rating INT,
                comment TEXT,
                is_complaint TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ feedback table ensuring.');

        // 2. Restaurant Feedbacks Table (Enhanced)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS restaurant_feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NULL,
                order_id INT NULL,
                meal_rating INT,
                service_rating INT,
                comment TEXT,
                is_complaint TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add steward_id to restaurant_feedbacks if missing
        const [cols] = await pool.query('DESCRIBE restaurant_feedbacks');
        const colNames = cols.map(c => c.Field);
        if (!colNames.includes('steward_id')) {
            await pool.query('ALTER TABLE restaurant_feedbacks ADD COLUMN steward_id INT NULL AFTER order_id');
            console.log('✅ Added steward_id to restaurant_feedbacks.');
        }

        console.log('✨ All feedback tables are correctly synchronized with the controller.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
