import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_qr_restaurant',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

// Test connection
(async () => {
    try {
        const connection = await pool.getConnection();
        const [[{ dbName }]] = await connection.query('SELECT DATABASE() as dbName');
        console.log(`Database connected successfully to: ${dbName}`);
        connection.release();
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
})();

export default pool;
