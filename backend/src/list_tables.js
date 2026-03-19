import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Nmk@6604',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

conn.query('SHOW TABLES', (err, results) => {
    if (err) {
        console.error(err);
    } else {
        const tables = results.map(r => Object.values(r)[0]);
        console.log("Tables in database:");
        console.log(JSON.stringify(tables, null, 2));
    }
    conn.end();
});
