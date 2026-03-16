import pool from './src/config/db.js';
async function run() {
    try {
        await pool.query('ALTER TABLE orders MODIFY customer_id INT NULL');
        console.log('✅ Altered orders table: customer_id is now NULLABLE');
        
        // Also check if order_type_id or status_id need defaults or nullability
        // status_id 1 is PENDING, which is fine.
        
    } catch (err) {
        console.error('❌ Failed to alter table:', err.message);
    }
    process.exit(0);
}
run();
