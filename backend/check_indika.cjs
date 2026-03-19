const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkIds() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'sdp_db'
    });
    
    try {
        const [rows] = await connection.execute(
            "SELECT su.id as staff_id, ss.supplier_id, s.name as supplier_name, su.full_name FROM staff_users su LEFT JOIN supplier_staff ss ON su.id = ss.staff_id LEFT JOIN suppliers s ON ss.supplier_id = s.id WHERE su.email = 'indika123@gmail.com'"
        );
        console.log(JSON.stringify(rows));
    } catch (e) { console.error(e); }
    finally { await connection.end(); }
}

checkIds();
