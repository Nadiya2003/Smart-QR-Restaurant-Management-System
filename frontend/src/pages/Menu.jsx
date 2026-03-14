import { useState, useEffect } from 'react';
import MenuItemCard from '../components/MenuItemCard';
import FloatingCart from '../components/FloatingCart';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
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
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            const response = await fetch('${config.API_BASE_URL}/api/menu');
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

    const categories = ['All', ...new Set(menuItems.map(item => item.category))];

    const filteredItems = activeCategory === 'All'
        ? menuItems
        : menuItems.filter(item => item.category === activeCategory);

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
