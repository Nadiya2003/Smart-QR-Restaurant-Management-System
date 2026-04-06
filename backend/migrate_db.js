import pool from './src/config/db.js';

async function migrate() {
    try {
        console.log('--- Database Migration ---');
        
        // 1. Add notes to order_items
        try {
            await pool.query('ALTER TABLE order_items ADD COLUMN notes TEXT');
            console.log('✓ Added notes to order_items');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') console.log('- Notes column already exists in order_items');
            else throw e;
        }

        // 2. Add notes to takeaway_orders if missing
        // Wait, takeaway_orders uses a JSON column 'items'. It should already contain notes within the JSON.
        
        // 3. Add notes to delivery_orders if missing
        // Delivery orders ALSO uses a JSON column 'items'.
        
        // 4. Ensure kitchen_status and bar_status exist in orders
        const [cols] = await pool.query('SHOW COLUMNS FROM orders');
        const colNames = cols.map(c => c.Field);
        if (!colNames.includes('kitchen_status')) {
            await pool.query("ALTER TABLE orders ADD COLUMN kitchen_status VARCHAR(20) DEFAULT 'pending'");
            console.log('✓ Added kitchen_status to orders');
        }
        if (!colNames.includes('bar_status')) {
            await pool.query("ALTER TABLE orders ADD COLUMN bar_status VARCHAR(20) DEFAULT 'pending'");
            console.log('✓ Added bar_status to orders');
        }
        if (!colNames.includes('main_status')) {
            await pool.query("ALTER TABLE orders ADD COLUMN main_status VARCHAR(20) DEFAULT 'PENDING'");
            console.log('✓ Added main_status to orders');
        }

        console.log('--- Migration Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('MIGRATION FAILED:', err);
        process.exit(1);
    }
}

migrate();
