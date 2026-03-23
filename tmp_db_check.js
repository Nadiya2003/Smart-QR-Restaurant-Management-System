import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'e:/Education/MIT/Third Year/Semester 01/SDP Project/App-based-Smart-QR-Restaurant-Management-System/backend/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkTables() {
    try {
        const [tables] = await pool.query('SELECT * FROM restaurant_tables');
        console.log('Tables:', tables);
        const [areas] = await pool.query('SELECT * FROM dining_areas');
        console.log('Areas:', areas);
        
        const [joined] = await pool.query(`
            SELECT t.*, a.area_name 
            FROM restaurant_tables t
            JOIN dining_areas a ON t.area_id = a.id
        `);
        console.log('Joined:', joined);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTables();
