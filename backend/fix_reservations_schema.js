import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

async function fix() {
    try {
        await pool.query("ALTER TABLE reservations ADD COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending'");
        console.log("Status column added.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
fix();
