import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    try {
        const tables = ['reports', 'order_analytics'];
        for (const table of tables) {
            const [rows] = await pool.query(`DESCRIBE ${table}`);
            console.log(`--- ${table} ---`);
            rows.forEach(r => console.log(r.Field));
        }
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
