import pool from './src/config/db.js';

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE inventory');
        console.log(JSON.stringify(rows));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
