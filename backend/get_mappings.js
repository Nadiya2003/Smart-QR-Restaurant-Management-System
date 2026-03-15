import pool from './src/config/db.js';
import fs from 'fs';

async function getMappings() {
    try {
        const results = {};
        const tables = ['order_types', 'order_statuses', 'payment_methods', 'payment_statuses'];
        for (const table of tables) {
            const [rows] = await pool.query(`SELECT * FROM ${table}`);
            results[table] = rows;
        }
        fs.writeFileSync('mappings.json', JSON.stringify(results, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

getMappings();
