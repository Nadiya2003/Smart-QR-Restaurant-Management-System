import pool from './src/config/db.js';

async function seedHistory() {
    try {
        console.log('Seeding stock history and usage stats...');

        // Get some items
        const [items] = await pool.query('SELECT id, item_name FROM inventory LIMIT 5');
        if (items.length === 0) {
            console.log('No inventory items found. Exiting.');
            process.exit(0);
        }

        // Add history logs
        for (const item of items) {
            await pool.query(`
                INSERT INTO stock_history (inventory_id, action_type, quantity, reason, performed_by)
                VALUES 
                (?, 'RESTOCK', 50, 'Monthly Supplier Delivery', 2),
                (?, 'REDUCE', 10, 'Kitchen Usage', 3),
                (?, 'ADJUST', 5, 'Inventory Count Correction', 2),
                (?, 'REDUCE', 2, 'Spoilage / Broken', 2)
            `, [item.id, item.id, item.id, item.id]);
        }
        
        // Add fake usage from orders
        const [[menuItem]] = await pool.query('SELECT id FROM menu_items LIMIT 1');
        if (menuItem) {
            const [[order]] = await pool.query('SELECT id FROM orders LIMIT 1');
            if (order) {
                // let's just insert some order items so the query works
                // actually wait, the query for usage stats is:
                // SELECT i.item_name, SUM(oi.quantity) as used_quantity
                // FROM order_items oi
                // JOIN inventory i ON oi.menu_item_id = i.menu_item_id ...
                // Wait, our inventory table HAS a menu_item_id column?
                // Let's check inventory table columns.
                const [columns] = await pool.query("SHOW COLUMNS FROM inventory");
                const hasMenuItemId = columns.some(c => c.Field === 'menu_item_id');
                if (hasMenuItemId) {
                    await pool.query('UPDATE inventory SET menu_item_id = ? WHERE id = ?', [menuItem.id, items[0].id]);
                    await pool.query(`
                        INSERT INTO order_items (order_id, menu_item_id, quantity, price)
                        VALUES (?, ?, 15, 500)
                    `, [order.id, menuItem.id]);
                }
            }
        }
        
        console.log('Sample data added successfully!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedHistory();
