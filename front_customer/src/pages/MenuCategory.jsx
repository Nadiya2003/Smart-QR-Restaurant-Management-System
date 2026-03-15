import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import config from '../config';

function MenuCategory() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch categories from backend
        fetch(`${config.API_BASE_URL}/api/menu`)
            .then(res => res.json())
            .then(items => {
                // Extract unique categories
                const uniqueCats = [...new Set(items.map(item => item.category))];
                setCategories(uniqueCats);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch categories:', err);
                setLoading(false);
            });
    }, []);

    const handleCategoryClick = (category) => {
        navigate(`/customer/menu-items/${category}`);
    };

    // Category display mapping
    const categoryInfo = {
        'SRI_LANKAN': { name: 'Foods', emoji: '🍛', description: 'Authentic Sri Lankan Cuisine' },
        'ITALIAN': { name: 'Italian Foods', emoji: '🍕', description: 'Italian Specialties' },
        'BEVERAGES': { name: 'Beverages', emoji: '🥤', description: 'Refreshing Drinks' },
        'APPETIZERS': { name: 'Appetizers', emoji: '🥙', description: 'Starters & Snacks' },
        'DESSERTS': { name: 'Desserts', emoji: '🍰', description: 'Sweet Delights' },
        'INDIAN': { name: 'Indian Foods', emoji: '🍛', description: 'Indian Specialties' }
    };

    return (
        <div className="min-h-screen bg-dark-gradient px-4 py-12">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs font-black uppercase tracking-[.3em] mb-6">
                        Menu Selection
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-gold-200 to-white bg-clip-text text-transparent tracking-tighter">
                        Choose Category
                    </h1>
                    <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium">
                        Explore our curated selection of premium dishes and beverages
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
                        <p className="mt-6 text-gray-500 font-bold uppercase tracking-widest text-sm">Loading categories...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up">
                        {categories.map((category) => {
                            const info = categoryInfo[category] || { name: category, emoji: '🍴', description: 'Delicious Items' };

                            return (
                                <GlassCard
                                    key={category}
                                    className="p-8 hover:border-gold-500/50 transition-all cursor-pointer group hover:scale-105 transform duration-300"
                                    onClick={() => handleCategoryClick(category)}
                                >
                                    <div className="text-center space-y-4">
                                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                            {info.emoji}
                                        </div>
                                        <h3 className="text-2xl font-black text-white group-hover:text-gold-500 transition-colors uppercase tracking-tight">
                                            {info.name}
                                        </h3>
                                        <p className="text-gray-400 text-sm font-medium">
                                            {info.description}
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4 group-hover:bg-gold-500 group-hover:text-black transition-all font-black"
                                        >
                                            View Items
                                        </Button>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MenuCategory;
