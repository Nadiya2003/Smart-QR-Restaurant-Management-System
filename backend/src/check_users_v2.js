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
        console.log('--- Database Metadata ---');
        
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(r => Object.values(r)[0]);
        console.log('Available Tables:', JSON.stringify(tableNames, null, 2));
        
        try {
            const [users] = await connection.query('DESCRIBE users');
            console.log('Users table exists with columns:', JSON.stringify(users, null, 2));
        } catch (e) {
            console.log('Users table DOES NOT exist');
        }

        try {
            const [staff_users] = await connection.query('DESCRIBE staff_users');
            console.log('staff_users exists');
        } catch (e) {
             console.log('staff_users DOES NOT exist');
        }

        try {
            const [online_customers] = await connection.query('DESCRIBE online_customers');
            console.log('online_customers exists');
        } catch (e) {
             console.log('online_customers DOES NOT exist');
        }

    } catch (err) {
        console.error('Master Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkTables();
