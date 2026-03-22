import pool from './src/config/db.js';

async function migrate() {
    const connection = await pool.getConnection();
    try {
        console.log('--- Fixing delivery_orders table schema ---');
        
        // Check if customer_id exists
        const [columns] = await connection.query('DESCRIBE delivery_orders');
        const columnNames = columns.map(c => c.Field);
        
        if (!columnNames.includes('customer_id')) {
            console.log('Adding customer_id to delivery_orders...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN customer_id INT AFTER id');
        }
        
        if (!columnNames.includes('items')) {
            console.log('Adding items to delivery_orders...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN items JSON AFTER address');
        }
        
        if (!columnNames.includes('payment_method')) {
            console.log('Adding payment_method to delivery_orders...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN payment_method VARCHAR(50) DEFAULT "CASH" AFTER total_price');
        }

        if (!columnNames.includes('transaction_id')) {
            console.log('Adding transaction_id to delivery_orders...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN transaction_id VARCHAR(100) AFTER payment_method');
        }

        if (!columnNames.includes('notes')) {
            console.log('Adding notes to delivery_orders...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN notes TEXT AFTER items');
        }

        if (!columnNames.includes('order_status')) {
            if (columnNames.includes('status')) {
                console.log('Renaming status to order_status in delivery_orders...');
                // We keep it VARCHAR to match takeaway_orders and avoid ENUM issues in merging
                await connection.query('ALTER TABLE delivery_orders CHANGE COLUMN status order_status VARCHAR(50) DEFAULT "pending"');
            } else {
                console.log('Adding order_status to delivery_orders...');
                await connection.query('ALTER TABLE delivery_orders ADD COLUMN order_status VARCHAR(50) DEFAULT "pending"');
            }
        }

        console.log('Migration completed!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
