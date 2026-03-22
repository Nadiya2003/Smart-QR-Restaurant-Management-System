import pool from './src/config/db.js';
import fs from 'fs';

async function describeTable() {
    try {
        const [columns] = await pool.query('DESCRIBE delivery_orders');
        fs.writeFileSync('delivery_orders_schema.json', JSON.stringify(columns, null, 2));
        console.log('Schema written to delivery_orders_schema.json');
        
        const [takeawayColumns] = await pool.query('DESCRIBE takeaway_orders');
        fs.writeFileSync('takeaway_orders_schema.json', JSON.stringify(takeawayColumns, null, 2));
        console.log('Schema written to takeaway_orders_schema.json');
    } catch (err) {
        fs.writeFileSync('schema_error.txt', err.message);
        console.error('Error describing table:', err);
    } finally {
        process.exit();
    }
}

describeTable();
