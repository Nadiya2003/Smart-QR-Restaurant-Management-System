import pool from './src/config/db.js';

async function updateSchemaDetailed() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        console.log('Updating delivery_orders schema with detailed payment and delivery statuses...');

        // 1. Add delivery_status if it doesn't exist
        const [cols] = await connection.query('DESCRIBE delivery_orders');
        const hasDeliveryStatus = cols.some(c => c.Field === 'delivery_status');
        if (!hasDeliveryStatus) {
            await connection.query(`ALTER TABLE delivery_orders ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'Pending' AFTER order_status`);
        }

        // 2. Modify payment_status to support the new flow: pending / collected / settled / paid
        await connection.query(`ALTER TABLE delivery_orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'pending'`);
        
        // 3. Modify payment_method to support: cash / qr / online
        await connection.query(`ALTER TABLE delivery_orders MODIFY COLUMN payment_method VARCHAR(50) DEFAULT 'cash'`);

        // 4. Update takeaway_orders as well for status tracking in customer dashboard
        const [takeawayCols] = await connection.query('DESCRIBE takeaway_orders');
        const hasTakeawayDeliveryStatus = takeawayCols.some(c => c.Field === 'delivery_status');
        if (!hasTakeawayDeliveryStatus) {
            await connection.query(`ALTER TABLE takeaway_orders ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'Pending' AFTER order_status`);
        }

        await connection.commit();
        console.log('Detailed schema update successful.');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('Detailed schema update failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

updateSchemaDetailed();
