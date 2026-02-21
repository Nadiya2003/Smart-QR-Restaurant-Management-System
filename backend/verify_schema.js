import pool from './src/config/db.js';

const checkSchema = async () => {
    const [rows] = await pool.query("SHOW TABLES");
    console.log(rows.map(r => Object.values(r)[0]));
    process.exit(0);
}

checkSchema();
