import React, { useMemo, useState, useEffect } from 'react';
import { SearchIcon, UserIcon } from 'lucide-react';
import { BottomNav } from '../components/layout/BottomNav';
import { CategoryFilter } from '../components/menu/CategoryFilter';
import { FoodCard } from '../components/menu/FoodCard';
import { useCart } from '../hooks/useCart';
import { useOrder } from '../hooks/useOrder';
import { api } from '../utils/api';

export function MenuPage({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stewards, setStewards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { addItem } = useCart();
  const { selectedStewardId } = useOrder();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuData, catData, stewardData] = await Promise.all([
        api.get('/menu'),
        api.get('/menu/categories/all'),
        api.get('/stewards')
      ]);
      const fetchedItems = menuData.menu || menuData;
      const fetchedCategories = catData.categories || catData;
      
      setMenuItems(fetchedItems);
      setCategories(fetchedCategories);
      setStewards(stewardData.stewards || stewardData);
      
      if (fetchedCategories.length > 0) {
        setActiveCategory(fetchedCategories[0].name);
      }
    } catch (error) {
      console.error('Failed to fetch menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const steward = stewards.find((s) => s.id === selectedStewardId);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !activeCategory || item.category === activeCategory || item.category_name === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, menuItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-bold">
              {steward?.avatar || steward?.name?.charAt(0) || <UserIcon className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs text-gray-500">Your Steward</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">
                  {steward?.name || 'Not selected'}
                </p>
                <button
                  onClick={() => onNavigate('steward')}
                  className="text-xs text-gray-900 underline font-medium"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 border-transparent rounded-full py-2.5 pl-10 pr-4 text-gray-900 focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-200 outline-none transition-all"
          />
        </div>

        {/* Categories */}
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {/* Menu Grid */}
      <div className="p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No items found matching your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <FoodCard key={item.id} menuItem={{
                ...item,
                image: item.image_url ? `http://localhost:5000${item.image_url}` : item.image,
                isAvailable: item.is_active === 1 || item.is_active === true || item.is_active === '1'
              }} onAddToCart={addItem} />
            ))}
          </div>
        )}
      </div>

      <BottomNav currentPage="menu" onNavigate={onNavigate} />
    </div>
  );
}

