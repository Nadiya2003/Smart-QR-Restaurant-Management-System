import pool from './src/config/db.js';
import fs from 'fs';

async function checkSchema() {
    let output = '';
    try {
        const tables = ['orders', 'order_analytics', 'takeaway_orders', 'delivery_orders'];
        for (const table of tables) {
            output += `--- ${table} ---\n`;
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            output += JSON.stringify(rows, null, 2) + '\n\n';
        }
        fs.writeFileSync('schema_output.json', output);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
