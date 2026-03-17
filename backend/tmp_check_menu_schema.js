import pool from './src/config/db.js';
import fs from 'fs';

async function check() {
    try {
        const [cols] = await pool.query('DESCRIBE menu_items');
        fs.writeFileSync('menu_items_schema.txt', cols.map(c => `${c.Field} (${c.Type})`).join(', '));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('menu_items_schema.txt', err.stack);
        process.exit(1);
    }
}

check();
