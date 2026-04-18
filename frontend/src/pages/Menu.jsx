import { useState, useEffect } from 'react';
import MenuItemCard from '../components/MenuItemCard';
import FloatingCart from '../components/FloatingCart';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { io } from 'socket.io-client';
import config from '../config';

/**
 * Menu Page - Browse food items, filter by category, and add to cart
 * Fetches data from the backend API
 */
function Menu() {
    const navigate = useNavigate();
    const { cart, addToCart, removeFromCart, orderType } = useCart();

    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchMenu();

        // Real-time Availability Sync
        const socket = io(config.API_BASE_URL);
        socket.on('menuUpdate', (data) => {
            console.log('Web Menu update received:', data);
            setMenuItems(prev => prev.map(item =>
                item.id === parseInt(data.itemId) ? { ...item, is_available: data.isAvailable ? 1 : 0 } : item
            ));
        });

        socket.on('menuChange', (data) => {
            console.log('Web Menu structural change:', data);
            fetchMenu();
        });

        return () => socket.disconnect();
    }, []);

    const fetchMenu = async () => {
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/menu`);
            if (!response.ok) throw new Error('Failed to fetch menu');
            const data = await response.json();
            setMenuItems(data);
            setLoading(false);
        } catch (err) {
            console.error('Menu fetch error:', err);
            setError('Could not load menu. Using fallback data.');
            setLoading(false);
            // Fallback data if API fails
            setMenuItems([
                { id: 1, name: 'Chicken Kottu', description: 'Spicy shredded roti with chicken', price: 1200, category: 'Sri Lankan', image: '/food/kottu.png' },
                { id: 2, name: 'Rice & Curry', description: 'Traditional Sri Lankan rice and curry', price: 750, category: 'Sri Lankan', image: '/food/rice_curry.png' },
                { id: 7, name: 'Margherita Pizza', description: 'Classic mozzarella and tomato', price: 1800, category: 'Italian', image: '/food/pizza.png' }
            ]);
        }
    };

    const baseCategories = [...new Set(menuItems
        .filter(item => (item.image_url || item.image) && item.is_active !== 0 && item.is_active !== false)
        .map(item => item.category))];

    const categoryOrder = [
        'Sri Lankan', 'Indian', 'Chinese', 'Italian', 
        'Beverages', 'Desserts', 'Fast Food'
    ];

    const categories = baseCategories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0]);
        }
    }, [categories, activeCategory]);

    const filteredItems = menuItems
        .filter(item => {
            const hasImage = item.image_url || item.image;
            const isActive = item.is_active !== 0 && item.is_active !== false;
            const isAvailable = item.is_available !== 0 && item.is_available !== false;
            return item.category === activeCategory && hasImage && isActive && isAvailable;
        })
        .slice(0, 6);

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
                        Currently Ordering for: <span className="text-[#D4AF37] font-bold uppercase">{orderType}</span>
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

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37]"></div>
                        <p className="mt-4 text-gray-400">Loading delicious food...</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                        {filteredItems.map((item) => (
                            <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredItems.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                        <p className="text-xl">No items found in this category</p>
                    </div>
                )}
            </div>

            {/* Floating Cart */}
            <FloatingCart
                onCheckout={handleCheckout}
            />
        </div>
    );
}

export default Menu;
