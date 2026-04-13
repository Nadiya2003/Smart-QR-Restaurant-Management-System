import pool from './src/config/db.js';

async function checkSchema() {
    try {
        const [columns] = await pool.query('DESCRIBE delivery_orders');
        console.log('--- delivery_orders SCHEMA ---');
        console.table(columns);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
