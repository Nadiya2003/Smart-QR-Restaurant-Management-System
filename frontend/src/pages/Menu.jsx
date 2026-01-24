import { useState } from 'react';
import MenuItemCard from '../components/MenuItemCard';
import FloatingCart from '../components/FloatingCart';
import { useNavigate } from 'react-router-dom';

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
            image: 'https://images.unsplash.com/photo-1628294895950-98052523e036?w=600&auto=format&fit=crop',
        },
        {
            id: 2,
            name: 'Cheese Kottu',
            description: 'Creamy cheese kottu with melted mozzarella and perfectly seasoned vegetables',
            price: 1400,
            category: 'Sri Lankan',
            image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop',
        },
        {
            id: 3,
            name: 'Egg Hoppers (3)',
            description: 'Traditional bowl-shaped pancakes with perfectly cooked eggs and coconut milk',
            price: 450,
            category: 'Sri Lankan',
            image: 'https://cdn.pixabay.com/photo/2021/01/24/07/04/hoppers-5944439_1280.jpg',
        },
        {
            id: 4,
            name: 'String Hoppers & Curry',
            description: 'Steamed rice noodle nests served with flavorful coconut curry and sambols',
            price: 650,
            category: 'Sri Lankan',
            image: 'https://cdn.pixabay.com/photo/2016/09/16/06/18/india-1673322_1280.jpg',
        },
        {
            id: 5,
            name: 'Rice & Curry',
            description: 'Authentic Sri Lankan rice with mixed curries, dhal, and traditional sides',
            price: 750,
            category: 'Sri Lankan',
            image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop',
        },
        {
            id: 6,
            name: 'Fish Ambul Thiyal',
            description: 'Tangy dried fish curry slow-cooked with goraka and aromatic spices',
            price: 1100,
            category: 'Sri Lankan',
            image: null,
        },
        // Italian Items
        {
            id: 7,
            name: 'Margherita Pizza',
            description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil',
            price: 1800,
            category: 'Italian',
            image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop',
        },
        {
            id: 8,
            name: 'Pepperoni Pizza',
            description: 'Loaded with premium pepperoni slices and extra mozzarella cheese',
            price: 2200,
            category: 'Italian',
            image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop',
        },
        {
            id: 9,
            name: 'Chicken Alfredo Pasta',
            description: 'Creamy fettuccine alfredo with grilled chicken and parmesan cheese',
            price: 2100,
            category: 'Italian',
            image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop',
        },
        {
            id: 10,
            name: 'Lasagna',
            description: 'Layered pasta with rich meat sauce, béchamel, and melted cheese',
            price: 2400,
            category: 'Italian',
            image: 'https://images.unsplash.com/photo-1574868291507-6f02d68c083b?w=600&auto=format&fit=crop',
        },
        {
            id: 11,
            name: 'Tiramisu',
            description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
            price: 950,
            category: 'Italian',
            image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop',
        },
    ];

    // Category filter state
    const [activeCategory, setActiveCategory] = useState('All');

    // Cart state
    const [cart, setCart] = useState([]);

    // Categories
    const categories = ['All', 'Sri Lankan', 'Italian'];

    // Filter items by category
    const filteredItems =
        activeCategory === 'All'
            ? menuItems
            : menuItems.filter((item) => item.category === activeCategory);

    // Add item to cart
    const handleAddToCart = (item) => {
        // Check if item already exists in cart
        const existingItem = cart.find((cartItem) => cartItem.id === item.id);

        if (existingItem) {
            // Increase quantity
            setCart(
                cart.map((cartItem) =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                )
            );
        } else {
            // Add new item with quantity 1
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    // Remove item from cart
    const handleRemoveItem = (itemId) => {
        setCart(cart.filter((item) => item.id !== itemId));
    };

    // Handle checkout
    const handleCheckout = () => {
        alert('Proceeding to checkout...');
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
