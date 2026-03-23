const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'e:/Education/MIT/Third Year/Semester 01/SDP Project/App-based-Smart-QR-Restaurant-Management-System/backend/.env' });

async function checkCols() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.query('SHOW COLUMNS FROM reservations');
        console.log('Columns in reservations:');
        rows.forEach(r => console.log(`- ${r.Field}`));
        
        const [rows2] = await connection.query('SHOW COLUMNS FROM order_statuses');
        console.log('\nColumns in order_statuses:');
        rows2.forEach(r => console.log(`- ${r.Field}`));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkCols();
