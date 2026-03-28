import React, { useMemo, useState, useEffect } from 'react';
import { SearchIcon, UserIcon, MapPinIcon, LogOutIcon, ClipboardListIcon } from 'lucide-react';
import { BottomNav } from '../components/layout/BottomNav';
import { CategoryFilter } from '../components/menu/CategoryFilter';
import { FoodCard } from '../components/menu/FoodCard';
import { useCart } from '../hooks/useCart';
import { useOrder } from '../hooks/useOrder';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';

export function MenuPage({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stewards, setStewards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { addItem } = useCart();
  const { currentOrder, selectedStewardId, tableNumber, clearOrder } = useOrder();
  const { isAuthenticated, logout } = useAuth();

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
            <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center text-gray-700 font-bold border-2 border-white shadow-sm">
              {steward?.avatar && !steward.avatar.includes('default.png') ? (
                <img 
                  src={steward.avatar} 
                  alt={steward.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                   {steward?.name?.charAt(0) || <UserIcon className="w-5 h-5" />}
                </div>
              )}
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

          <div className="h-8 w-[1px] bg-gray-200"></div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 font-bold border-2 border-white shadow-sm">
                <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Your Table</p>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">
                  Table {tableNumber || '--'}
                </p>
                <button
                  onClick={() => onNavigate('change-table')}
                  className="text-xs text-gray-900 underline font-medium"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          {!isAuthenticated && (
            <button 
              onClick={async () => {
                logout();
                await clearOrder();
                onNavigate('welcome');
              }}
              className="flex flex-col items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOutIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">Exit</span>
            </button>
          )}
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
                image: (item.image_url || item.image) ? (
                  (item.image_url || item.image).startsWith('http') 
                    ? (item.image_url || item.image) 
                    : `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${item.image_url || item.image}`
                ) : null,
                isAvailable: item.is_active !== 0 && item.is_active !== false && item.is_active !== '0'
              }} onAddToCart={addItem} />
            ))}
          </div>
        )}
      </div>

      {/* Floating View Active Order Button (Requirement 13) */}
      {currentOrder && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-30 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <button 
             onClick={() => onNavigate('tracking')}
             className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between group overflow-hidden relative"
           >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <ClipboardListIcon className="w-5 h-5 text-amber-400" />
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Active Order</p>
                    <p className="text-sm font-bold truncate max-w-[180px]">Order #{currentOrder.id}</p>
                 </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                 <span className="text-[10px] font-black uppercase tracking-tighter">View Details</span>
              </div>
           </button>
        </div>
      )}

      <BottomNav currentPage="menu" onNavigate={onNavigate} />
    </div>
  );
}

