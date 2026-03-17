import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [orders] = await conn.execute(`
            SELECT o.id, os.name as status, rt.table_number, o.created_at
            FROM orders o 
            LEFT JOIN restaurant_tables rt ON o.table_id = rt.id 
            LEFT JOIN order_statuses os ON o.status_id = os.id 
            WHERE os.name IN ('PENDING', 'CONFIRMED', 'PREPARING')
            ORDER BY o.id DESC
        `);
        
        console.log(`Found ${orders.length} active orders.`);

        for (const o of orders) {
            const [items] = await conn.execute(`
                SELECT mi.name, c.name as cat 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                JOIN categories c ON mi.category_id = c.id 
                WHERE oi.order_id = ?
            `, [o.id]);
            
            const food = items.filter(i => i.cat !== 'Beverages').length;
            const drinks = items.filter(i => i.cat === 'Beverages').length;
            
            console.log(`Order ${o.id} (T-${o.table_number}): Status=${o.status}, Food=${food}, Drinks=${drinks}`);
            items.forEach(i => console.log(`  - ${i.name} (${i.cat})`));
        }
        await conn.end();
    } catch (err) {
        console.error(err);
    }
}
run();
