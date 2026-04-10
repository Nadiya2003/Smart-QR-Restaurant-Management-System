import pool from './src/config/db.js';

async function checkBevs() {
    try {
        console.log('--- Checking for Beverage Orders ---');
        
        // 1. Check if any beverage categories exist
        const [cats] = await pool.query('SELECT id, name FROM categories WHERE name LIKE "%beverage%" OR name LIKE "%drink%" OR name LIKE "%bar%"');
        console.log('Beverage Categories in DB:', cats);
        
        if (cats.length === 0) {
            console.log('WARNING: No beverage categories found in DB!');
            process.exit(0);
        }

        const catIds = cats.map(c => c.id);
        
        // 2. Check if any orders have items in these categories
        const [ordersWithBevs] = await pool.query(`
            SELECT DISTINCT oi.order_id 
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE mi.category_id IN (?)
        `, [catIds]);
        
        console.log('Order IDs with beverages:', ordersWithBevs.map(o => o.order_id));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkBevs();
