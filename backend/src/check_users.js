import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'smart_qr_restaurant'
    });

    try {
        const [rows] = await connection.query('SHOW TABLES');
        console.log('Tables:', rows.map(r => Object.values(r)[0]));
        
        try {
            const [users] = await connection.query('SELECT * FROM users LIMIT 1');
            console.log('Users table exists');
        } catch (e) {
            console.log('Users table DOES NOT exist:', e.message);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkTables();
