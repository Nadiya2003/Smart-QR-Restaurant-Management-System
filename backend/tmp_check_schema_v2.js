import pool from './src/config/db.js';

async function check() {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const names = tables.map(t => Object.values(t)[0]);
        console.log('--- TABLES ---');
        console.log(names.join('\n'));
        
        for (const name of names) {
            if (['staff_attendance', 'orders', 'table_reservations', 'reservations', 'bookings'].includes(name)) {
                console.log(`\n--- SCHEMA: ${name} ---`);
                const [cols] = await pool.query(`DESCRIBE ${name}`);
                console.log(cols.map(c => `${c.Field} (${c.Type})`).join(', '));
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
