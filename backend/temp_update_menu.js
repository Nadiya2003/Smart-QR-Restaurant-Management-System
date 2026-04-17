import pool from './src/config/db.js';

async function updateSriLankanMenu() {
    try {
        const [cats] = await pool.query('SELECT id FROM categories WHERE name = "Sri Lankan"');
        if (cats.length === 0) {
            console.log('Category "Sri Lankan" not found');
            process.exit(1);
        }
        const slCatId = cats[0].id;
        
        // delete existing Sri Lankan items
        await pool.query('DELETE FROM menu_items WHERE category_id = ?', [slCatId]);
        
        const slItems = [
            [slCatId, 'Chicken Fried Rice', 'Traditional delicious chicken fried rice with Sri Lankan spices', 1100.00, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', '["Sri Lankan", "Lunch"]', 'Food', 1, 1, 0, 700.00],
            [slCatId, 'Chicken Kottu', 'Chopped flatbread mixed with vegetables, egg and succulent chicken', 950.00, 'https://images.unsplash.com/photo-1596797038583-18a685627355?w=400', '["Street Food", "Spicy"]', 'Food', 1, 1, 0, 600.00],
            [slCatId, 'Rice and Curry', 'Traditional village style rice and curry with 5 veg curries', 650.00, 'https://images.unsplash.com/photo-1582576163090-6c9147ad192c?w=400', '["Traditional", "Lunch", "Vegetarian"]', 'Food', 1, 1, 0, 350.00],
            [slCatId, 'String Hoppers', 'Steamed rice flour noodles served with kiri hodi and coconut sambol', 450.00, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400', '["Breakfast", "Dinner"]', 'Food', 1, 1, 0, 250.00],
            [slCatId, 'Hoppers', 'Crispy bowl-shaped pancakes (2 plain, 1 egg) served with lunu miris', 400.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400', '["Breakfast", "Dinner"]', 'Food', 1, 1, 0, 200.00]
        ];
        
        for (const item of slItems) {
            await pool.query(
                "INSERT INTO menu_items (category_id, name, description, price, image, tags, item_type, is_active, is_available, bonus_points, buying_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                item
            );
        }
        console.log("Updated Sri Lankan Menu items successfully.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateSriLankanMenu();
