import pool from './src/config/db.js';

async function listTables() {
    try {
        const [rows] = await pool.query('SHOW TABLES');
        console.log('TABLES:');
        rows.forEach(r => console.log(`- ${Object.values(r)[0]}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listTables();
