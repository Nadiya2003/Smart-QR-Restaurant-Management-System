const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
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
        console.log('--- restaurant_tables ---');
        const [tableSchema] = await pool.query('DESCRIBE restaurant_tables');
        console.log(tableSchema);

        console.log('\n--- reservations (selection) ---');
        const [resSchema] = await pool.query('DESCRIBE reservations');
        console.log(resSchema);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
