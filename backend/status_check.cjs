const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkStatus() {
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
        console.log('--- order_statuses ---');
        const [statuses] = await pool.query('SELECT * FROM order_statuses');
        console.log(statuses);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkStatus();
