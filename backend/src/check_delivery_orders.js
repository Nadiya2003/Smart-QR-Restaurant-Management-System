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
        const [rows] = await connection.query('DESCRIBE delivery_orders');
        console.log('delivery_orders columns:', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkTables();
