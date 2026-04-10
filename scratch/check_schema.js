import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

import pool from '../backend/src/config/db.js';

async function checkSchema() {
    try {
        console.log('--- reservations table ---');
        const [resSchema] = await pool.query('DESCRIBE reservations');
        console.table(resSchema);

        console.log('\n--- restaurant_tables table ---');
        const [tableSchema] = await pool.query('DESCRIBE restaurant_tables');
        console.table(tableSchema);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
