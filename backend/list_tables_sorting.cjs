const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function listAllTables() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT a.area_name, t.table_number 
            FROM restaurant_tables t 
            JOIN dining_areas a ON t.area_id = a.id 
            ORDER BY a.area_name, t.table_number
        `);
        console.log('--- TABLES START ---');
        console.log(JSON.stringify(rows));
        console.log('--- TABLES END ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listAllTables();
