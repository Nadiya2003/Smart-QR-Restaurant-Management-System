import pool from './src/config/db.js';
import fs from 'fs';

async function check() {
    let output = '';
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const names = tables.map(t => Object.values(t)[0]);
        output += '--- TABLES ---\n' + names.join('\n') + '\n';
        
        for (const name of names) {
            if (['staff_attendance', 'orders', 'table_reservations', 'reservations', 'bookings'].includes(name)) {
                output += `\n--- SCHEMA: ${name} ---\n`;
                const [cols] = await pool.query(`DESCRIBE ${name}`);
                output += cols.map(c => `${c.Field} (${c.Type})`).join(', ') + '\n';
            }
        }
        
        fs.writeFileSync('schema_log.txt', output);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('schema_log.txt', err.stack);
        process.exit(1);
    }
}

check();
