import pool from './src/config/db.js';

async function updateSchema() {
    try {
        // Check if item_status column exists in order_items
        const [columns] = await pool.query('DESCRIBE order_items');
        const hasItemStatus = columns.some(c => c.Field === 'item_status');
        
        if (!hasItemStatus) {
            console.log('Adding item_status column to order_items...');
            await pool.query("ALTER TABLE order_items ADD COLUMN item_status VARCHAR(20) DEFAULT 'pending'");
        } else {
            console.log('item_status column already exists in order_items.');
        }

        // Also check main_status in orders table
        const [orderCols] = await pool.query('DESCRIBE orders');
        const hasMainStatus = orderCols.some(c => c.Field === 'main_status');
        if (!hasMainStatus) {
            console.log('Adding main_status column to orders...');
            await pool.query("ALTER TABLE orders ADD COLUMN main_status VARCHAR(50) DEFAULT 'PLACED'");
        }

        console.log('Schema updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Schema Update Error:', err);
        process.exit(1);
    }
}

updateSchema();
