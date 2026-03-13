import pool from './src/config/db.js';
import fs from 'fs';

async function checkOrdersSchema() {
    try {
        const [dRows] = await pool.query('DESCRIBE delivery_orders');
        const [tRows] = await pool.query('DESCRIBE takeaway_orders');
        fs.writeFileSync('orders_schema.json', JSON.stringify({ delivery: dRows, takeaway: tRows }, null, 2));
        console.log('Saved to orders_schema.json');
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkOrdersSchema();
