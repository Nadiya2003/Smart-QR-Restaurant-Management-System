import pool from './src/config/db.js';

async function listTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.log(JSON.stringify(rows.map(r => Object.values(r)[0]), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

listTables();
