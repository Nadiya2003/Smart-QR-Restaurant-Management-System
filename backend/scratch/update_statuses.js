
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Nmk@6604',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

async function updateStatuses() {
    try {
        const statuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'PAYMENT_COMPLETED', 'COMPLETED', 'CANCELLED'];
        for (const name of statuses) {
            const [rows] = await pool.query("SELECT id FROM order_statuses WHERE name = ?", [name]);
            if (rows.length === 0) {
                await pool.query("INSERT INTO order_statuses (name) VALUES (?)", [name]);
                console.log(`Added status: ${name}`);
            }
        }
        console.log("Statuses up to date.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateStatuses();
