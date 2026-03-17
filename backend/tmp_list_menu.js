import pool from './src/config/db.js';
import fs from 'fs';

async function listMenu() {
    try {
        const [rows] = await pool.query('SELECT * FROM menu_items');
        fs.writeFileSync('e:\\Education\\MIT\\Third Year\\Semester 01\\SDP Project\\App-based-Smart-QR-Restaurant-Management-System\\backend\\tmp_menu_items.json', JSON.stringify(rows.map(r => r.name), null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listMenu();
