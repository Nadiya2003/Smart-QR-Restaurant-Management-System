import pool from './src/config/db.js';

async function check() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM inventory');
        const names = columns.map(c => c.Field);
        console.log('Columns in inventory:', names.join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
