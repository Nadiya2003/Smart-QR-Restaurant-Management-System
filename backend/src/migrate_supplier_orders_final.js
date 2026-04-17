import pool from './config/db.js';

async function run() {
    try {
        console.log('Starting migration...');

        // 1. Add created_at if not exists
        try {
            await pool.query('ALTER TABLE supplier_orders ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('Added created_at');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                 console.log('created_at already exists');
            } else {
                 console.error('Error adding created_at:', e.message);
            }
        }

        // 2. Add updated_at if not exists
        try {
            await pool.query('ALTER TABLE supplier_orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('Added updated_at');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('updated_at already exists');
            } else {
                console.error('Error adding updated_at:', e.message);
            }
        }

        // 3. Update Status Enum
        try {
            await pool.query("ALTER TABLE supplier_orders MODIFY COLUMN status ENUM('PENDING','APPROVED','RECEIVED','CANCELLED','DELIVERED','COMPLETED') DEFAULT 'PENDING'");
            console.log('Updated status enum');
        } catch (e) {
            console.error('Failed to update status enum:', e.message);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

run();
