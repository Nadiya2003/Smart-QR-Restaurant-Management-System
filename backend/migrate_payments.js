import pool from './src/config/db.js';

(async () => {
    try {
        console.log('Starting payment migration...');
        
        // 1. Create payment methods table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        
        // 2. Insert default methods
        await pool.query(`
            INSERT IGNORE INTO payment_methods (name) 
            VALUES ('Cash'), ('Card'), ('Online')
        `);

        // 3. Update orders table to include payment info
        // Check if columns exist first to avoid errors
        const [cols] = await pool.query("SHOW COLUMNS FROM orders");
        const colNames = cols.map(c => c.Field);
        
        if (!colNames.includes('payment_method_id')) {
            await pool.query("ALTER TABLE orders ADD COLUMN payment_method_id INT NULL");
            await pool.query("ALTER TABLE orders ADD CONSTRAINT fk_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)");
        }
        
        if (!colNames.includes('paid_at')) {
            await pool.query("ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL");
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
})();
