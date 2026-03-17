import pool from './src/config/db.js';

async function fixInventory() {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory');
        console.log(`Found ${rows.length} items to check.`);

        for (const item of rows) {
            let newCat = item.category;
            const name = item.item_name.toLowerCase();

            // Mapping logic
            const kitchenKeywords = ['rice', 'chicken', 'flour', 'milk', 'sugar', 'salt', 'oil', 'pepper', 'butter', 'sauce', 'meat', 'spice', 'vegetable', 'onion', 'garlic'];
            const barKeywords = ['coke', 'juice', 'soda', 'water', 'wine', 'beer', 'whiskey', 'beverage', 'drink', 'bottle'];

            if (kitchenKeywords.some(k => name.includes(k)) || ['Meat', 'Oil', 'Dry Goods', 'Dairy', 'Condiments', 'Spices'].includes(item.category)) {
                newCat = 'Kitchen';
            } else if (barKeywords.some(k => name.includes(k))) {
                newCat = 'Bar';
            } else {
                newCat = 'General';
            }

            if (newCat !== item.category) {
                console.log(`Updating ${item.item_name}: ${item.category} -> ${newCat}`);
                await pool.query('UPDATE inventory SET category = ? WHERE id = ?', [newCat, item.id]);
            }
        }

        console.log('Final check:');
        const [final] = await pool.query('SELECT category, COUNT(*) as count FROM inventory GROUP BY category');
        console.table(final);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fixInventory();
