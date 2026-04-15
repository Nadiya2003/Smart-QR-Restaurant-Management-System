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
        const [desc] = await pool.query('DESCRIBE delivery_orders');
        console.log('delivery_orders schema:', JSON.stringify(desc, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTables();
