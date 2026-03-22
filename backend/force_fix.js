import pool from './src/config/db.js';

async function forceFix() {
    const connection = await pool.getConnection();
    try {
        console.log('--- Force Fixing delivery_orders table ---');
        
        // Check columns
        const [columns] = await connection.query('DESCRIBE delivery_orders');
        const columnNames = columns.map(c => c.Field);
        console.log('Current columns:', columnNames.join(', '));

        if (!columnNames.includes('order_status')) {
            console.log('Adding order_status column...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN order_status VARCHAR(50) DEFAULT "pending"');
        } else {
            console.log('order_status already exists.');
        }

        if (!columnNames.includes('customer_id')) {
            console.log('Adding customer_id column...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN customer_id INT AFTER id');
        }

        if (!columnNames.includes('items')) {
            console.log('Adding items column...');
            await connection.query('ALTER TABLE delivery_orders ADD COLUMN items JSON AFTER address');
        }

        console.log('Refetching columns...');
        const [newCols] = await connection.query('DESCRIBE delivery_orders');
        console.log('New columns:', newCols.map(c => c.Field).join(', '));

    } catch (err) {
        console.error('Force fix failed:', err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

forceFix();
