import pool from './src/config/db.js';

async function updateSchema() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        console.log('Updating delivery_orders schema...');

        // 1. Update payment_status to be VARCHAR and default to Pending
        // We'll first check if it's already VARCHAR or if we need to convert data
        await connection.query(`ALTER TABLE delivery_orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'Pending'`);
        
        // Map existing values
        await connection.query(`UPDATE delivery_orders SET payment_status = 'Completed' WHERE payment_status = 'Paid'`);
        await connection.query(`UPDATE delivery_orders SET payment_status = 'Pending' WHERE payment_status IN ('Unpaid', 'Cash on Delivery')`);

        // 2. Ensure payment_method exists and is VARCHAR
        // (It already exists as VARCHAR(50) DEFAULT 'CASH')
        
        // 3. Update order_status default and ensure it's VARCHAR
        // (It already exists as VARCHAR(50) DEFAULT 'pending')
        
        await connection.commit();
        console.log('Schema updated successfully.');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('Schema update failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

updateSchema();
