import dotenv from 'dotenv';
dotenv.config();
import pool from './src/config/db.js';

async function f() {
    try {
        const [rows] = await pool.query('SELECT * FROM payment_methods');
        console.log("Current methods:", rows);
        const hasBank = rows.find(i => i.name === 'Bank Payment');
        if (!hasBank) {
            await pool.query("INSERT INTO payment_methods (name) VALUES ('Bank Payment')");
            console.log("Bank Payment added");
        } else {
            console.log("Bank Payment already exists");
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
f();
