const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Nmk@6604',
        database: process.env.DB_NAME || 'sdp_db'
    });
    
    try {
        const [inv] = await connection.execute("SHOW TABLES LIKE 'inventory'");
        const [sup] = await connection.execute("SHOW TABLES LIKE 'suppliers'");
        const [hist] = await connection.execute("SHOW TABLES LIKE 'stock_history'");
        const [req] = await connection.execute("SHOW TABLES LIKE 'supplier_requests'");
        const [ord] = await connection.execute("SHOW TABLES LIKE 'supplier_orders'");
        const [notif] = await connection.execute("SHOW TABLES LIKE 'staff_notifications'");

        console.log(`Inventory: ${inv.length > 0 ? 'OK' : 'MISSING'}`);
        console.log(`Suppliers: ${sup.length > 0 ? 'OK' : 'MISSING'}`);
        console.log(`History: ${hist.length > 0 ? 'OK' : 'MISSING'}`);
        console.log(`Requests: ${req.length > 0 ? 'OK' : 'MISSING'}`);
        console.log(`Orders: ${ord.length > 0 ? 'OK' : 'MISSING'}`);
        console.log(`Notif: ${notif.length > 0 ? 'OK' : 'MISSING'}`);

    } catch (e) { console.error(e); }
    finally { await connection.end(); }
}

checkTables();
