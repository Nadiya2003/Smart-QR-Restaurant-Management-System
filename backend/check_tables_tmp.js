
import pool from './src/config/db.js';
import fs from 'fs';

async function checkTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        fs.writeFileSync('tables_list.txt', tables.join('\n'));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTables();
