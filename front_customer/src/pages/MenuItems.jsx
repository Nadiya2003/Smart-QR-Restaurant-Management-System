import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function MenuItems() {
    const { category } = useParams();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);

    useEffect(() => {
        // Load cart from localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }

        // Fetch menu items
        fetch('http://localhost:5000/api/menu')
            .then(res => res.json())
            .then(data => {
                const filtered = data.filter(item => item.category === category);
                setItems(filtered);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch menu items:', err);
                setLoading(false);
            });
    }, [category]);

    const addToCart = (item) => {
        const existingItem = cart.find(c => c.id === item.id);
        let newCart;

        if (existingItem) {
            newCart = cart.map(c =>
                c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
            );
        } else {
            newCart = [...cart, { ...item, quantity: 1 }];
        }

        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    const goToCart = () => {
        navigate('/customer/cart');
    };

    const categoryNames = {
        'SRI_LANKAN': 'Sri Lankan Foods',
        'ITALIAN': 'Italian Foods',
        'BEVERAGES': 'Beverages',
        'APPETIZERS': 'Appetizers',
        'DESSERTS': 'Desserts',
        'INDIAN': 'Indian Foods'
    };

    return (
        <div className="min-h-screen bg-dark-gradient px-4 py-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <button
                            onClick={() => navigate('/customer/menu-category')}
                            className="text-gray-400 hover:text-gold-500 mb-4 flex items-center gap-2 font-bold"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Categories
                        </button>
                        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-gold-200 to-white bg-clip-text text-transparent tracking-tighter">
                            {categoryNames[category] || category}
                        </h1>
                    </div>

                    {/* Cart Badge */}
                    <button
                        onClick={goToCart}
                        className="relative bg-gold-500 hover:bg-gold-600 text-black px-6 py-3 rounded-xl font-black flex items-center gap-2 transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        View Cart
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
                        <p className="mt-6 text-gray-500 font-bold uppercase tracking-widest text-sm">Loading items...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-xl">No items available in this category</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map((item) => (
                            <GlassCard key={item.id} className="overflow-hidden hover:border-gold-500/50 transition-all group">
                                {/* Image */}
                                <div className="h-48 overflow-hidden bg-white/5">
                                    <img
                                        src={item.image ? `http://localhost:5000/food/${item.image}` : '/placeholder-food.png'}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    <h3 className="text-xl font-black text-white group-hover:text-gold-500 transition-colors">
                                        {item.name}
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-black text-gold-500">
                                            Rs. {item.price?.toLocaleString()}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={() => addToCart(item)}
                                        className="w-full font-black"
                                    >
                                        Add to Cart
                                    </Button>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MenuItems;
