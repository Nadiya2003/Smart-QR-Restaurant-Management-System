import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const test = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'smart_qr_restaurant'
        });
        console.log('Successfully connected to database:', process.env.DB_NAME);
        const [rows] = await connection.query('SHOW TABLES');
        console.log('Tables in database:', rows.map(r => Object.values(r)[0]));
        await connection.end();
    } catch (err) {
        console.error('Database connection test failed:', err.message);
    }
};

test();
