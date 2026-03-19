import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Nmk@6604',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

const describeTable = (tableName) => {
    return new Promise((resolve, reject) => {
        conn.query(`DESCRIBE ${tableName}`, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

async function checkSchemas() {
    try {
        const tables = ['delivery_orders', 'cancel_requests', 'staff_attendance', 'delivery_riders'];
        const schemas = {};
        for (const table of tables) {
            schemas[table] = await describeTable(table);
        }
        console.log(JSON.stringify(schemas, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        conn.end();
    }
}

checkSchemas();
