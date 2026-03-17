import pool from './src/config/db.js';
import fs from 'fs';

async function listSups() {
    try {
        const [rows] = await pool.query('SELECT * FROM suppliers');
        let txt = '';
        rows.forEach(r => {
            txt += `${r.id}: ${r.brand_name || r.name} - ${r.contact_name}\n`;
        });
        fs.writeFileSync('tmp_sups.txt', txt);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listSups();
