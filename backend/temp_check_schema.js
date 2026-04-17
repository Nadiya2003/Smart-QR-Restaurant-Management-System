import pool from './src/config/db.js';

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE menu_items');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
