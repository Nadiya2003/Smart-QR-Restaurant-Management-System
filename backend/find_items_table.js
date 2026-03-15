import pool from './src/config/db.js';
import fs from 'fs';

async function listAllTables() {
    let out = '';
    try {
        const [rows] = await pool.query('SHOW TABLES');
        const tables = rows.map(r => Object.values(r)[0]);
        out += JSON.stringify(tables, null, 2) + '\n\n';
        
        for (const table of tables) {
            out += `--- ${table} ---\n`;
            try {
                const [cols] = await pool.query(`DESCRIBE ${table}`);
                out += JSON.stringify(cols.map(c => c.Field), null, 2) + '\n';
            } catch (e) {
                out += `Error: ${e.message}\n`;
            }
        }
        fs.writeFileSync('full_schema.txt', out);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

listAllTables();
