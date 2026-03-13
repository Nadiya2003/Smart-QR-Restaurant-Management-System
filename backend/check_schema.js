import pool from './src/config/db.js';
import fs from 'fs';

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE online_customers');
        fs.writeFileSync('schema_output.json', JSON.stringify(rows, null, 2));
        console.log('Schema output saved to schema_output.json');
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkSchema();
