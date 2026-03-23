const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkOrdersTable() {
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
        const [oSchema] = await pool.query('DESCRIBE orders');
        console.log('--- orders columns ---');
        console.log(oSchema);
        
        const [recentOrders] = await pool.query(`
            SELECT o.id, o.customer_id, o.table_id, o.status_id, o.order_type, o.customer_name 
            FROM orders o 
            ORDER BY o.created_at DESC LIMIT 5
        `);
        console.log('--- recent orders in DB ---');
        console.log(recentOrders);

        const [oiCheck] = await pool.query(`
            SELECT oi.order_id, count(*) as items
            FROM order_items oi
            GROUP BY oi.order_id
            LIMIT 5
        `);
        console.log('--- order_items check ---');
        console.log(oiCheck);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOrdersTable();
