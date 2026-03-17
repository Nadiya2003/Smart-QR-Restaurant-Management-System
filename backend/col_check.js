import pool from './src/config/db.js';

async function check() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM inventory');
        console.log(JSON.stringify(columns, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
