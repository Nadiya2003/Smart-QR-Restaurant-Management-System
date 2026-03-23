const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkKitchenOrders() {
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
        const [orders] = await pool.query(`
            SELECT o.id, o.total_price, o.created_at, rt.table_number, os.name as status,
                   coalesce(o.customer_name, c.name) as customer_name, 
                   coalesce(ot.name, 'DINE_IN') as order_type_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price, 'category', cat.name)
                   ) FROM order_items oi 
                   JOIN menu_items mi ON oi.menu_item_id = mi.id 
                   JOIN categories cat ON mi.category_id = cat.id
                   WHERE oi.order_id = o.id) as items
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN order_types ot ON o.order_type_id = ot.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE os.name IS NULL OR UPPER(os.name) NOT IN ('COMPLETED', 'CANCELLED', 'DELIVERED')
        `);
        
        const processed = orders.map(o => {
            const pItems = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
            o.items = pItems.filter(i => {
                const cat = (i.category || i.category_name || '').toLowerCase();
                return cat !== 'beverages';
            });
            return o;
        }).filter(o => o.items && o.items.length > 0);
        
        console.log('processed ids:', processed.map(o => o.id));
        if (processed.length > 0) {
            console.log('first processed items:', JSON.stringify(processed[0].items));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkKitchenOrders();
