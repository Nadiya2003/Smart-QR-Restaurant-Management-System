
import pool from '../config/db.js';

async function seedData() {
    try {
        console.log("Seeding Database with sample data...");

        // 1. Categories
        const categories = [
            'Sri Lankan', 'Indian', 'Chinese', 'Italian', 
            'Beverages', 'Desserts', 'Fast Food', 'Seafood', 
            'Vegetarian', 'Special Items'
        ];
        for (const cat of categories) {
            await pool.query("INSERT IGNORE INTO categories (name) VALUES (?)", [cat]);
        }
        console.log("Categories seeded.");

        // 2. Suppliers
        const suppliers = [
            ['Fresh Mart', 'Fresh Mart Pvt Ltd', 'John Doe', '0771234567', 'contact@freshmart.lk', 'Col 07', 'Vegetables', 'Approved'],
            ['Ocean Catch', 'Ocean Catch Seafoods', 'Jane Smith', '0719876543', 'orders@oceancatch.lk', 'Negombo', 'Seafood', 'Pending'],
            ['Dairy Best', 'Dairy Best Farms', 'Milk Man', '0751112233', 'sales@dairybest.com', 'Kandy', 'Dairy', 'Approved']
        ];
        await pool.query("INSERT IGNORE INTO suppliers (name, company_name, contact_person, phone, email, address, product_category, status) VALUES ?", [suppliers]);
        console.log("Suppliers seeded.");

        // 3. Inventory
        const inventory = [
            ['Basmati Rice', 'Dry Goods', 50, 'kg', 5],
            ['Chicken Breast', 'Meat', 20, 'kg', 5],
            ['Olive Oil', 'Oil', 10, 'liters', 5],
            ['Flour', 'Dry Goods', 30, 'kg', 5],
            ['Milk', 'Dairy', 15, 'liters', 5],
            ['Sugar', 'Dry Goods', 25, 'kg', 5],
            ['Tomato Sauce', 'Condiments', 50, 'pcs', 10],
            ['Salt', 'Condiments', 10, 'kg', 2],
            ['Butter', 'Dairy', 5, 'kg', 2],
            ['Black Pepper', 'Spices', 2, 'kg', 1]
        ];
        for (const inv of inventory) {
             await pool.query("INSERT IGNORE INTO inventory (item_name, category, quantity, unit, low_stock_threshold) VALUES (?, ?, ?, ?, ?)", inv);
        }
        console.log("Inventory seeded.");

        // 4. Menu Items
        const [catRows] = await pool.query("SELECT id, name FROM categories");
        const catMap = catRows.reduce((acc, row) => { acc[row.name] = row.id; return acc; }, {});

        const menuItems = [
            [catMap['Sri Lankan'], 'Traditional Rice and Curry', 'Traditional village style rice and curry with 5 veg curries', 450.00, 'https://images.unsplash.com/photo-1582576163090-6c9147ad192c?w=400', '["Traditional", "Lunch"]'],
            [catMap['Sri Lankan'], 'Chicken Kottu Roti', 'Chopped flatbread mixed with vegetables, egg and meat', 750.00, 'https://images.unsplash.com/photo-1596797038583-18a685627355?w=400', '["Street Food", "Spicy"]'],
            [catMap['Indian'], 'Butter Chicken Curry', 'Creamy tomato based chicken curry with spices', 950.00, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', '["Classic", "Mild"]'],
            [catMap['Indian'], 'Tandoori Paneer Tikka', 'Grilled cubes of cottage cheese with bell peppers', 850.00, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400', '["Vegetarian", "Starter"]'],
            [catMap['Chinese'], 'Spicy Kung Pao Chicken', 'Spicy, stir-fried Chinese dish with chicken and peanuts', 800.00, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400', '["Spicy", "Authentic"]'],
            [catMap['Italian'], 'Cheese Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella and basil', 1200.00, 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400', '["Classic", "Kids Choice"]'],
            [catMap['Beverages'], 'Ginger Tea (Ceylon)', 'Warm cup of authentic Ceylon tea with fresh ginger', 150.00, 'https://images.unsplash.com/photo-1544787210-22bb68b373e4?w=400', '["Traditional", "Warm"]'],
            [catMap['Desserts'], 'Rich Watalappam', 'Rich coconut custard pudding made with jaggery', 350.00, 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400', '["Traditional", "Sweet"]'],
            [catMap['Fast Food'], 'Double Cheese Burger', 'Beef patty with melted cheese, lettuce and tomato', 1100.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', '["Quick Bite"]'],
            [catMap['Seafood'], 'Garlic Butter Prawns XL', 'Large prawns sautéed in garlic infused butter sauce', 1800.00, 'https://images.unsplash.com/photo-1521193089946-7aa29d1fe73a?w=400', '["Premium", "Seafood"]']
        ];

        for (const item of menuItems) {
            await pool.query(
                "INSERT IGNORE INTO menu_items (category_id, name, description, price, image, tags, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
                item
            );
        }
        console.log("Menu Items seeded.");

        console.log("Seeding complete.");

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
seedData();
