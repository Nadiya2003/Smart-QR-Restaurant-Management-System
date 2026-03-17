import pool from './src/config/db.js';
import fs from 'fs';

async function listAll() {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY item_name');
        let content = `TOTAL INVENTORY ITEMS: ${rows.length}\n`;
        rows.forEach(r => {
            content += `- ${r.item_name} (Category: ${r.category}, ID: ${r.id})\n`;
        });
        fs.writeFileSync('e:\\Education\\MIT\\Third Year\\Semester 01\\SDP Project\\App-based-Smart-QR-Restaurant-Management-System\\backend\\tmp_full_inv_list.txt', content);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listAll();
