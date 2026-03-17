import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
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
        const [rows] = await pool.query('SELECT * FROM inventory');
        fs.writeFileSync('e:\\Education\\MIT\\Third Year\\Semester 01\\SDP Project\\App-based-Smart-QR-Restaurant-Management-System\\backend\\tmp_inventory_data.json', JSON.stringify(rows, null, 2));
        
        const [schema] = await pool.query('DESCRIBE inventory');
        fs.writeFileSync('e:\\Education\\MIT\\Third Year\\Semester 01\\SDP Project\\App-based-Smart-QR-Restaurant-Management-System\\backend\\tmp_inventory_schema.json', JSON.stringify(schema, null, 2));
        
        console.log('Success - wrote rows:', rows.length);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
