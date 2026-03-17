import pool from './src/config/db.js';

async function seedMoreItems() {
    try {
        const items = [
            // BAR
            { name: 'Coca Cola 500ml', cat: 'Bar', qty: 100, unit: 'pcs', min: 20 },
            { name: 'Sprite 500ml', cat: 'Bar', qty: 50, unit: 'pcs', min: 10 },
            { name: 'Fanta Orange', cat: 'Bar', qty: 45, unit: 'pcs', min: 10 },
            { name: 'Mineral Water 1L', cat: 'Bar', qty: 200, unit: 'pcs', min: 50 },
            { name: 'Lion Beer Bottle', cat: 'Bar', qty: 120, unit: 'pcs', min: 24 },
            { name: 'Red Wine (Spanish)', cat: 'Bar', qty: 12, unit: 'Bottle', min: 3 },
            { name: 'White Wine (French)', cat: 'Bar', qty: 8, unit: 'Bottle', min: 3 },
            { name: 'Orange Juice Concentrate', cat: 'Bar', qty: 20, unit: 'Liters', min: 5 },
            { name: 'Apple Juice Concentrate', cat: 'Bar', qty: 15, unit: 'Liters', min: 5 },
            { name: 'Tonic Water', cat: 'Bar', qty: 40, unit: 'pcs', min: 12 },
            
            // KITCHEN
            { name: 'Beef Undercut', cat: 'Kitchen', qty: 25, unit: 'kg', min: 5 },
            { name: 'Mutton Chops', cat: 'Kitchen', qty: 15, unit: 'kg', min: 5 },
            { name: 'Tiger Prawns Jumbo', cat: 'Kitchen', qty: 10, unit: 'kg', min: 2 },
            { name: 'Sea Bass Fillet', cat: 'Kitchen', qty: 8, unit: 'kg', min: 3 },
            { name: 'Red Onions', cat: 'Kitchen', qty: 50, unit: 'kg', min: 10 },
            { name: 'Garlic (Peeled)', cat: 'Kitchen', qty: 12, unit: 'kg', min: 3 },
            { name: 'Ginger Whole', cat: 'Kitchen', qty: 5, unit: 'kg', min: 2 },
            { name: 'Potatoes (Local)', cat: 'Kitchen', qty: 60, unit: 'kg', min: 15 },
            { name: 'Mysore Dhal', cat: 'Kitchen', qty: 40, unit: 'kg', min: 10 },
            { name: 'Fresh Eggs (Large)', cat: 'Kitchen', qty: 10, unit: 'Tray', min: 3 },
            { name: 'Chili Powder (Extra Hot)', cat: 'Kitchen', qty: 5, unit: 'kg', min: 1 },
            { name: 'Turmeric Powder', cat: 'Kitchen', qty: 2, unit: 'kg', min: 0.5 },
            { name: 'Coconut Milk (Canned)', cat: 'Kitchen', qty: 40, unit: 'Liters', min: 10 },
            { name: 'Soy Sauce (Light)', cat: 'Kitchen', qty: 12, unit: 'Liters', min: 2 },
            
            // GENERAL
            { name: 'Paper Napkins (White)', cat: 'General', qty: 50, unit: 'Packets', min: 10 },
            { name: 'Dishwashing Liquid', cat: 'General', qty: 20, unit: 'Liters', min: 5 },
            { name: 'Surface Sanitizer', cat: 'General', qty: 15, unit: 'Liters', min: 5 },
            { name: 'Hand Wash Refill', cat: 'General', qty: 10, unit: 'Liters', min: 3 },
            { name: 'Takeaway Boxes (M)', cat: 'General', qty: 500, unit: 'pcs', min: 100 },
            { name: 'Biodegradable Straws', cat: 'General', qty: 1000, unit: 'pcs', min: 200 }
        ];

        console.log(`Seeding ${items.length} new items...`);

        for (const item of items) {
            // Check if exists
            const [exists] = await pool.query('SELECT id FROM inventory WHERE item_name = ?', [item.name]);
            if (exists.length === 0) {
                await pool.query(
                    'INSERT INTO inventory (item_name, category, quantity, unit, min_level, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [item.name, item.cat, item.qty, item.unit, item.min, 'Available']
                );
                console.log(`Added: ${item.name}`);
            } else {
                console.log(`Skipped (exists): ${item.name}`);
            }
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedMoreItems();
