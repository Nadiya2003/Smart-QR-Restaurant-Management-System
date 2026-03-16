import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
});

async function check() {
    try {
        // Test getStewardOrders query
        const [orders] = await pool.query(`
            SELECT o.*, rt.table_number, os.name as status,
                   c.name as customer_name,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price)
                   ) FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = o.id) as items,
                   COALESCE(o.total_price,
                       (SELECT SUM(oa.total_price) FROM order_analytics oa WHERE oa.order_id = o.id)
                   ) as total_price
            FROM orders o
            JOIN restaurant_tables rt ON o.table_id = rt.id
            JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            WHERE (o.steward_id = 1 OR o.steward_id IS NULL)
              AND os.name NOT IN ('COMPLETED', 'CANCELLED')
            ORDER BY o.created_at DESC
        `);
        console.log("Orders fetched:", orders.length);
        if (orders.length > 0) console.log("Sample:", JSON.stringify(orders[0]).substring(0, 200));
        
        // Test areas
        const [areas] = await pool.query("SELECT id, area_name FROM dining_areas LIMIT 5");
        console.log("Areas:", JSON.stringify(areas));
        
        // Test getAllOrders  
        const [dineOrders] = await pool.query(`
            SELECT o.*, "DINE-IN" as order_type, rt.table_number, os.name as status, c.name as customer_name,
                   (SELECT GROUP_CONCAT(CONCAT(oi.quantity, 'x ', mi.name) SEPARATOR ', ')
                    FROM order_items oi
                    JOIN menu_items mi ON oi.menu_item_id = mi.id
                    WHERE oi.order_id = o.id) as items_summary
            FROM orders o
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
            LEFT JOIN order_statuses os ON o.status_id = os.id
            LEFT JOIN online_customers c ON o.customer_id = c.id
            ORDER BY o.created_at DESC LIMIT 3
        `);
        console.log("Admin dine-in orders:", dineOrders.length);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit();
    }
}
check();
