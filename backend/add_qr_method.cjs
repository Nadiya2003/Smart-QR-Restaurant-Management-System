
const mysql = require('mysql2/promise');
const pool = mysql.createPool({ 
    host: 'localhost', 
    user: 'root', 
    password: 'Nmk@6604', 
    database: 'smart_qr_restaurant', 
    port: 3306 
});

async function run() {
    try {
        await pool.query("INSERT INTO payment_methods (id, name) VALUES (4, 'QR Payment') ON DUPLICATE KEY UPDATE name='QR Payment'");
        console.log('QR Method added');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
