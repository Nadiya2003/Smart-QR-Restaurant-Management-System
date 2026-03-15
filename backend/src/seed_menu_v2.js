
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Nmk@6604',
    database: process.env.DB_NAME || 'smart_qr_restaurant'
};

const categories = [
    { name: 'Sri Lankan', description: 'Traditional Sri Lankan flavors', image: '/uploads/menu/srilankan.png' },
    { name: 'Indian', description: 'Authentic Indian spices', image: '/uploads/menu/indian.png' },
    { name: 'Chinese', description: 'Classic Chinese favorites', image: '/uploads/menu/chinese.png' },
    { name: 'Beverages', description: 'Refreshing drinks and juices', image: '/uploads/menu/beverages.png' },
    { name: 'Desserts', description: 'Sweet treats and delights', image: '/uploads/menu/desserts.png' }
];

const menuItems = [
    // Sri Lankan
    { name: 'Chicken Kottu', price: 1200, category: 'Sri Lankan', image: '/uploads/menu/srilankan.png', description: 'Chopped flatbread mixed with chicken, vegetables, and aromatic spices.' },
    { name: 'Egg Hopper Set', price: 450, category: 'Sri Lankan', image: '/uploads/menu/srilankan.png', description: 'Two plain hoppers and one egg hopper served with lunu miris.' },
    { name: 'Dhal Curry', price: 350, category: 'Sri Lankan', image: '/uploads/menu/srilankan.png', description: 'Red lentils cooked in coconut milk with traditional Sri Lankan spices.' },
    { name: 'Pol Sambol', price: 200, category: 'Sri Lankan', image: '/uploads/menu/srilankan.png', description: 'Freshly scraped coconut mixed with chili, onion, and lime.' },
    { name: 'Chicken Lamprais', price: 1500, category: 'Sri Lankan', image: '/uploads/menu/srilankan.png', description: 'Rice boiled in stock, served with a variety of curries wrapped in banana leaf.' },
    { name: 'Fish Ambul Thiyal', price: 900, category: 'Sri Lankan', image: '/uploads/menu/srilankan.png', description: 'Sour fish curry cooked with goraka and black pepper.' },

    // Indian
    { name: 'Butter Chicken', price: 1400, category: 'Indian', image: '/uploads/menu/indian.png', description: 'Tender chicken in a rich, creamy tomato-based sauce.' },
    { name: 'Chicken Biryani', price: 1600, category: 'Indian', image: '/uploads/menu/indian.png', description: 'Fragrant basmati rice cooked with spiced chicken and herbs.' },
    { name: 'Paneer Tikka', price: 1100, category: 'Indian', image: '/uploads/menu/indian.png', description: 'Grilled chunks of cottage cheese marinated in spices.' },
    { name: 'Garlic Naan', price: 300, category: 'Indian', image: '/uploads/menu/indian.png', description: 'Soft leavened flatbread topped with garlic and butter.' },
    { name: 'Dal Makhani', price: 950, category: 'Indian', image: '/uploads/menu/indian.png', description: 'Slow-cooked black lentils in a creamy, buttery sauce.' },
    { name: 'Mutton Rogan Josh', price: 1800, category: 'Indian', image: '/uploads/menu/indian.png', description: 'Brain-tender mutton cooked in a yogurt-based gravy with spices.' },

    // Chinese
    { name: 'Kung Pao Chicken', price: 1300, category: 'Chinese', image: '/uploads/menu/chinese.png', description: 'Spicy stir-fried chicken with peanuts, vegetables, and chili peppers.' },
    { name: 'Vegetable Fried Rice', price: 850, category: 'Chinese', image: '/uploads/menu/chinese.png', description: 'Stir-fried rice with fresh vegetables and soy sauce.' },
    { name: 'Sweet and Sour Fish', price: 1450, category: 'Chinese', image: '/uploads/menu/chinese.png', description: 'Crispy fish fillets tossed in a tangy sweet and sour sauce.' },
    { name: 'Beef with Broccoli', price: 1550, category: 'Chinese', image: '/uploads/menu/chinese.png', description: 'Tender beef slices stir-fried with fresh broccoli florets.' },
    { name: 'Spring Rolls (4pcs)', price: 600, category: 'Chinese', image: '/uploads/menu/chinese.png', description: 'Crispy rolls filled with shredded vegetables.' },
    { name: 'Hot and Sour Soup', price: 700, category: 'Chinese', image: '/uploads/menu/chinese.png', description: 'Traditional soup with tofu, bamboo shoots, and wood ear mushrooms.' },

    // Beverages
    { name: 'Fresh Lime Soda', price: 400, category: 'Beverages', image: '/uploads/menu/beverages.png', description: 'Chilled soda with fresh lime juice and sugar/salt.' },
    { name: 'Mango Lassi', price: 650, category: 'Beverages', image: '/uploads/menu/beverages.png', description: 'Creamy yogurt-based drink mixed with sweet mango pulp.' },
    { name: 'Iced Coffee', price: 550, category: 'Beverages', image: '/uploads/menu/beverages.png', description: 'Strong brewed coffee served chilled with milk and sugar.' },
    { name: 'Watermelon Juice', price: 500, category: 'Beverages', image: '/uploads/menu/beverages.png', description: 'Freshly squeezed sweet watermelon juice.' },
    { name: 'Chocolate Milkshake', price: 800, category: 'Beverages', image: '/uploads/menu/beverages.png', description: 'Rich chocolate blended with milk and vanilla ice cream.' },
    { name: 'Ceylon Tea', price: 200, category: 'Beverages', image: '/uploads/menu/beverages.png', description: 'Premium Sri Lankan tea served hot with milk or lemon.' },

    // Desserts
    { name: 'Watalappam', price: 500, category: 'Desserts', image: '/uploads/menu/desserts.png', description: 'Traditional Sri Lankan coconut custard pudding with jaggery and spices.' },
    { name: 'Chocolate Lava Cake', price: 950, category: 'Desserts', image: '/uploads/menu/desserts.png', description: 'Warm chocolate cake with a molten chocolate center.' },
    { name: 'Gulab Jamun (2pcs)', price: 400, category: 'Desserts', image: '/uploads/menu/desserts.png', description: 'Deep-fried milk dumplings soaked in sugar syrup.' },
    { name: 'Fruit Salad with Ice Cream', price: 750, category: 'Desserts', image: '/uploads/menu/desserts.png', description: 'Seasonal fresh fruit chunks topped with a scoop of vanilla ice cream.' },
    { name: 'New York Cheesecake', price: 1100, category: 'Desserts', image: '/uploads/menu/desserts.png', description: 'Rich and creamy cheesecake with a graham cracker crust.' },
    { name: 'Gelato Assortment', price: 850, category: 'Desserts', image: '/uploads/menu/desserts.png', description: 'Three scoops of premium artisanal Italian-style ice cream.' }
];

async function seed() {
    let conn;
    try {
        conn = await mysql.createConnection(config);
        console.log('Connected to database for seeding...');

        // 1. Seed Categories first
        for (const cat of categories) {
            await conn.execute(
                'INSERT INTO categories (name, description, image) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description), image = VALUES(image)',
                [cat.name, cat.description, cat.image]
            );
        }
        console.log('Categories seeded.');

        // Get Category IDs
        const [catRows] = await conn.execute('SELECT id, name FROM categories');
        const catMap = {};
        catRows.forEach(row => catMap[row.name] = row.id);

        // 2. Seed Menu Items
        // First, clear existing menu items to avoid duplicates if re-running
        // await conn.execute('DELETE FROM menu_items');
        
        for (const item of menuItems) {
            const category_id = catMap[item.category];
            if (category_id) {
                await conn.execute(
                    'INSERT INTO menu_items (name, price, category_id, image, description) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE price = VALUES(price), category_id = VALUES(category_id), image = VALUES(image), description = VALUES(description)',
                    [item.name, item.price, category_id, item.image, item.description]
                );
            }
        }
        console.log('Menu items seeded.');

    } catch (err) {
        console.error('Seeding error:', err);
    } finally {
        if (conn) await conn.end();
        process.exit();
    }
}

seed();
