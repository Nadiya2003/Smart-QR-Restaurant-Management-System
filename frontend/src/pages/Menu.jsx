import { useState } from 'react';
import MenuItemCard from '../components/MenuItemCard';
import FloatingCart from '../components/FloatingCart';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

/**
 * Menu Page - Browse food items, filter by category, and add to cart
 * Features all Sri Lankan and Italian menu items with prices in Rs.
 * Updated to GOLD theme
 */
function Menu() {
    const navigate = useNavigate();

    // Menu items data (static dummy data)
    const menuItems = [
        // Sri Lankan Items
        {
            id: 1,
            name: 'Chicken Kottu',
            description: 'Spicy stir-fried shredded roti with chicken, vegetables, and aromatic spices',
            price: 1200,
            category: 'Sri Lankan',
            image: '/food/kottu.png',
        },
        {
            id: 2,
            name: 'Rice & Curry',
            description: 'Authentic Sri Lankan rice with mixed curries, dhal, and traditional sides',
            price: 750,
            category: 'Sri Lankan',
            image: '/food/rice_curry.png',
        },
        {
            id: 3,
            name: 'Egg Hoppers (3)',
            description: 'Traditional bowl-shaped pancakes with perfectly cooked eggs and coconut milk',
            price: 450,
            category: 'Sri Lankan',
            image: '/food/hoppers.png',
        },
        {
            id: 4,
            name: 'Fried Rice',
            description: 'Sri Lankan style chicken fried rice with chili paste and fried egg',
            price: 780,
            category: 'Sri Lankan',
            image: '/food/fried_rice.png',
        },
        {
            id: 5,
            name: 'Parotta & Curry',
            description: 'Flaky parotta served with spicy chicken curry',
            price: 650,
            category: 'Sri Lankan',
            image: '/food/parotta.png',
        },
        {
            id: 6,
            name: 'Chicken Biriyani',
            description: 'Aromatic basmati rice cooked with spices and chicken',
            price: 1100,
            category: 'Sri Lankan',
            image: '/food/biriyani.png',
        },
        // Italian Items
        {
            id: 7,
            name: 'Margherita Pizza',
            description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil',
            price: 1800,
            category: 'Italian',
            image: '/food/pizza.png',
        },
        {
            id: 8,
            name: 'Spaghetti Carbonara',
            description: 'Classic pasta with egg, cheese, pancetta, and black pepper',
            price: 2200,
            category: 'Italian',
            image: '/food/carbonara.png',
        },
        {
            id: 9,
            name: 'Mushroom Risotto',
            description: 'Creamy rice dish with wild mushrooms and parmesan',
            price: 2100,
            category: 'Italian',
            image: '/food/risotto.png',
        },
        {
            id: 10,
            name: 'Lasagna',
            description: 'Layered pasta with rich meat sauce, béchamel, and melted cheese',
            price: 2400,
            category: 'Italian',
            image: '/food/lasagna.png',
        },
        {
            id: 11,
            name: 'Tiramisu',
            description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
            price: 950,
            category: 'Italian',
            image: '/food/tiramisu.png',
        },
        // Beverages
        {
            id: 12,
            name: 'Classic Mojito',
            description: 'Refreshing cool mint and lime cocktail',
            price: 600,
            category: 'Beverages',
            image: '/food/mojito.png',
        },
        {
            id: 13,
            name: 'Coca Cola',
            description: 'Chilled glass of coke with lemon slice',
            price: 200,
            category: 'Beverages',
            image: '/food/coke.png',
        },
        {
            id: 14,
            name: 'Mixed Fruit Juice',
            description: 'Fresh blended juice with mango, papaya, and orange',
            price: 450,
            category: 'Beverages',
            image: '/food/fruit_juice.png',
        },
        {
            id: 15,
            name: 'Iced Coffee',
            description: 'Cold brewed coffee with milk and caramel',
            price: 550,
            category: 'Beverages',
            image: '/food/coffee.png',
        },
    ];

    // Category filter state
    const [activeCategory, setActiveCategory] = useState('All');

    // Use global Cart Context
    const { cart, addToCart, removeFromCart } = useCart();

    // Categories
    const categories = ['All', 'Sri Lankan', 'Italian', 'Beverages'];

    // Filter items by category
    const filteredItems =
        activeCategory === 'All'
            ? menuItems
            : menuItems.filter((item) => item.category === activeCategory);

    // Add item to cart
    const handleAddToCart = (item) => {
        addToCart(item);
    };

    // Remove item from cart
    const handleRemoveItem = (itemId) => {
        removeFromCart(itemId);
    };

    // Handle checkout
    const handleCheckout = () => {
        navigate('/delivery');
    };

    return (
        <div className="min-h-screen px-4 py-12">
            <div className="container mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Menu</h1>
                    <p className="text-gray-400 text-lg">
                        Explore our delicious selection of Sri Lankan and Italian dishes
                    </p>
                </div>

                {/* Category Filter Pills */}
                <div className="flex justify-center gap-4 mb-12 flex-wrap">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeCategory === category
                                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/50'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Menu Items Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                    {filteredItems.map((item) => (
                        <MenuItemCard key={item.id} item={item} onAddToCart={handleAddToCart} />
                    ))}
                </div>

                {/* Empty State */}
                {filteredItems.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                        <p className="text-xl">No items found in this category</p>
                    </div>
                )}
            </div>

            {/* Floating Cart */}
            <FloatingCart
                cart={cart}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
            />
        </div>
    );
}

export default Menu;
