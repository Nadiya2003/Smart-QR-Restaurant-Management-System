const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkTables() {
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
        const [tables] = await pool.query('SELECT * FROM restaurant_tables');
        const [areas] = await pool.query('SELECT * FROM dining_areas');
        const [joined] = await pool.query(`
            SELECT t.*, a.area_name 
            FROM restaurant_tables t
            INNER JOIN dining_areas a ON t.area_id = a.id
        `);
        const [leftJoined] = await pool.query(`
            SELECT t.*, a.area_name 
            FROM restaurant_tables t
            LEFT JOIN dining_areas a ON t.area_id = a.id
        `);
        
        console.log(`Raw Tables Count: ${tables.length}`);
        console.log(`Areas Count: ${areas.length}`);
        console.log(`Inner Joined Count: ${joined.length}`);
        console.log(`Left Joined Count: ${leftJoined.length}`);
        
        if (tables.length > 0) {
            console.log('Sample Table Column Names:', Object.keys(tables[0]));
            console.log('Sample Table Data:', tables[0]);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTables();
