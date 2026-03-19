const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function listSuppliers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'sdp_db'
    });
    
    try {
        const [rows] = await connection.execute("SELECT * FROM suppliers");
        console.log(JSON.stringify(rows));
    } catch (e) { console.error(e); }
    finally { await connection.end(); }
}

listSuppliers();
