import pool from './src/config/db.js';
import fs from 'fs';

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE reservations');
        fs.writeFileSync('reservations_schema.json', JSON.stringify(rows, null, 2));
        console.log('Saved to reservations_schema.json');
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkSchema();
