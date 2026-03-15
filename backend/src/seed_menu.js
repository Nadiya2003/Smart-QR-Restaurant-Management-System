import pool from './config/db.js';

async function seed() {
    try {
        console.log('Starting Seeding...');

        const menuItems = [
            {
                category: 'Sri Lankan',
                items: [
                    { name: 'Rice and Curry', price: 450, description: 'Traditional Sri Lankan rice served with various curries.', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500' },
                    { name: 'Chicken Kottu', price: 650, description: 'Chopped flatbread mixed with chicken, vegetables, and spices.', image: 'https://images.unsplash.com/photo-1599307767316-776533bb941c?w=500' },
                    { name: 'Egg Kottu', price: 550, description: 'Chopped flatbread mixed with eggs and spicy gravy.', image: 'https://images.unsplash.com/photo-1601050633722-64c2444b7482?w=500' },
                    { name: 'String Hoppers', price: 300, description: 'Steamed rice flour noodles served with dhal and sambol.', image: 'https://images.unsplash.com/photo-1630409351241-e90e7f5e434d?w=500' },
                    { name: 'Hoppers', price: 200, description: 'Bowl-shaped pancakes made from fermented rice batter.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500' },
                    { name: 'Chicken Fried Rice', price: 700, description: 'Savory stir-fried rice with chicken and spices.', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500' }
                ]
            },
            {
                category: 'Indian',
                items: [
                    { name: 'Butter Chicken', price: 1200, description: 'Tender chicken in a rich tomato-based butter sauce.', image: 'https://images.unsplash.com/photo-1603894584202-933259bb3156?w=500' },
                    { name: 'Chicken Biryani', price: 950, description: 'Fragrant basmati rice cooked with spiced chicken.', image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?w=500' },
                    { name: 'Paneer Curry', price: 850, description: 'Soft paneer cubes in a flavorful curry sauce.', image: 'https://images.unsplash.com/photo-1517244492177-246a0c50ca13?w=500' },
                    { name: 'Naan', price: 150, description: 'Soft, leavened flatbread baked in a tandoor.', image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d59085?w=500' },
                    { name: 'Masala Dosa', price: 400, description: 'Crispy crepe filled with spiced potato filling.', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500' },
                    { name: 'Tandoori Chicken', price: 1100, description: 'Chicken marinated in yogurt and spices, roasted in a tandoor.', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c175f0?w=500' }
                ]
            },
            {
                category: 'Beverages',
                items: [
                    { name: 'Mango Juice', price: 250, description: 'Freshly squeezed mango juice.', image: 'https://images.unsplash.com/photo-1546173159-315724a9aa0f?w=500' },
                    { name: 'Lime Juice', price: 150, description: 'Refreshing lime juice with a hint of mint.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500' },
                    { name: 'Iced Coffee', price: 350, description: 'Chilled coffee served with ice and milk.', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500' },
                    { name: 'Milkshake', price: 450, description: 'Thick and creamy milkshake in various flavors.', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500' },
                    { name: 'Fresh Orange Juice', price: 300, description: 'Pure squeezed orange juice.', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500' },
                    { name: 'Tea / Coffee', price: 100, description: 'Hot brewed tea or coffee.', image: 'https://images.unsplash.com/photo-1544787210-2827448b3cb3?w=500' }
                ]
            },
            {
                category: 'Desserts',
                items: [
                    { name: 'Ice Cream', price: 300, description: 'Assorted flavors of creamy ice cream.', image: 'https://images.unsplash.com/photo-1501443762994-82bd5dabb892?w=500' },
                    { name: 'Chocolate Cake', price: 500, description: 'Rich and moist chocolate cake.', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500' },
                    { name: 'Fruit Salad', price: 350, description: 'Fresh seasonal fruit mix.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500' },
                    { name: 'Watalappan', price: 400, description: 'Classic Sri Lankan coconut custard pudding.', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=500' },
                    { name: 'Brownie', price: 450, description: 'Gooey chocolate brownie with walnuts.', image: 'https://images.unsplash.com/photo-1606312619070-d48b4c6c23c2?w=500' },
                    { name: 'Cheesecake', price: 600, description: 'Creamy New York style cheesecake.', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500' }
                ]
            }
        ];

        for (const catData of menuItems) {
            // Check if category exists
            const [existingCat] = await pool.query('SELECT id FROM categories WHERE name = ?', [catData.category]);
            let catId;
            if (existingCat.length > 0) {
                catId = existingCat[0].id;
            } else {
                const [result] = await pool.query('INSERT INTO categories (name, description, image) VALUES (?, ?, ?)', [catData.category, catData.category + ' specialized dishes.', '🍽️']);
                catId = result.insertId;
                console.log(`Created category: ${catData.category}`);
            }

            for (const item of catData.items) {
                // Check if item exists
                const [existingItem] = await pool.query('SELECT id FROM menu_items WHERE name = ? AND category_id = ?', [item.name, catId]);
                if (existingItem.length === 0) {
                    await pool.query(
                        'INSERT INTO menu_items (category_id, name, description, price, image, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
                        [catId, item.name, item.description, item.price, item.image]
                    );
                    console.log(`Added item: ${item.name}`);
                }
            }
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
