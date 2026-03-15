import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('TABLE_LIST_START');
        tables.forEach(t => console.log(t));
        console.log('TABLE_LIST_END');
        process.exit(0);
    } catch (err) {
        console.error('Error checking tables:', err);
        process.exit(1);
    }
}

checkTables();
