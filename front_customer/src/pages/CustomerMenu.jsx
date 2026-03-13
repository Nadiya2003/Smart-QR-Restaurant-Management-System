import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

export default function CustomerMenu() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('SRI_LANKAN');

  // Load cart from localStorage
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('customerCart');
    return saved ? JSON.parse(saved) : [];
  });

  const [showCart, setShowCart] = useState(false);
  const [menuItems, setMenuItems] = useState({
    SRI_LANKAN: [],
    ITALIAN: [],
    INDIAN: [],
    APPETIZERS: [],
    DESSERTS: [],
    BEVERAGES: []
  });
  const [loading, setLoading] = useState(true);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('customerCart', JSON.stringify(cart));
  }, [cart]);

  // Fetch Menu from API
  useEffect(() => {
    fetch('http://192.168.1.3:5000/api/menu')
      .then(res => res.json())
      .then(data => {
        const grouped = {
          SRI_LANKAN: [],
          ITALIAN: [],
          INDIAN: [],
          APPETIZERS: [],
          DESSERTS: [],
          BEVERAGES: []
        };

        data.forEach(item => {
          const cat = item.category ? item.category.toUpperCase() : 'BEVERAGES';
          if (grouped[cat]) {
            grouped[cat].push(item);
          } else if (grouped['BEVERAGES']) {
            grouped['BEVERAGES'].push(item);
          }
        });
        setMenuItems(grouped);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch menu', err);
        setLoading(false);
      });
  }, []);

  const addToCart = (item) => {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
      setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const currentItems = menuItems[selectedCategory] || [];

  const categories = [
    { id: 'SRI_LANKAN', label: 'Sri Lankan' },
    { id: 'ITALIAN', label: 'Italian' },
    { id: 'INDIAN', label: 'Indian' },
    { id: 'APPETIZERS', label: 'Appetizers' },
    { id: 'DESSERTS', label: 'Desserts' },
    { id: 'BEVERAGES', label: 'Beverages' },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#060606] via-[#0b0b10] to-[#101018] text-white p-4 md:p-8 pb-32 md:pb-8`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-1.5 h-8 bg-gold-500 rounded-full"></div>
            <h1 className="text-5xl font-black tracking-tight">Culinaria Menu</h1>
          </div>
          <p className="text-gray-400 text-lg ml-6">Exquisite flavors from around the world, curated for your pleasure.</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-8 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap border-2 ${selectedCategory === cat.id
                ? 'bg-gold-500 text-black border-gold-500 shadow-[0_0_30px_rgba(212,175,55,0.4)] scale-105'
                : 'bg-white/5 border-white/10 hover:border-gold-500/30 text-white/70 hover:text-white'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 font-medium">Preparing our digital menu...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-card border-dashed">
              <p className="text-gray-400 text-xl">We're currently updating our {selectedCategory.toLowerCase()} selection.</p>
            </div>
          ) : (
            currentItems.map(item => (
              <GlassCard key={item.id} className="overflow-hidden hover:bg-white/[0.08] transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] group border-white/5">
                <div className="flex flex-col h-full">
                  <div className="relative mb-6 overflow-hidden rounded-2xl h-56 shadow-2xl">
                    <img
                      src={item.image && item.image.includes('.') ? `/food/${item.image}` : '/food/placeholder.png'}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/food/placeholder.png';
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                      <span className="px-3 py-1 bg-gold-500 text-black text-[10px] font-black uppercase tracking-widest rounded-md">
                        {selectedCategory}
                      </span>
                    </div>
                  </div>

                  <div className="px-2">
                    <h3 className="text-2xl font-black mb-2 text-white group-hover:text-gold-500 transition-colors">{item.name}</h3>
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-2xl font-black text-white/90">
                        <span className="text-gold-500 text-sm font-bold mr-1">LKR</span>
                        {item.price.toLocaleString()}
                      </p>
                      <div className="h-0.5 flex-1 mx-4 bg-white/5 rounded-full"></div>
                    </div>

                    <Button variant="primary" onClick={() => addToCart(item)} className="w-full py-4 text-md font-black shadow-lg">
                      Add to Selection
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setShowCart(!showCart)}
        className="fixed bottom-20 md:bottom-12 right-12 bg-gold-500 text-black px-8 py-4 rounded-3xl font-black shadow-[0_10px_40px_rgba(212,175,55,0.4)] hover:bg-white hover:text-black transition-all duration-300 text-lg z-30 flex items-center gap-4 group"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </span>
        <div className="flex flex-col items-start leading-none pt-1">
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Your Cart</span>
          <span>{cart.length} Items</span>
        </div>
      </button>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCart(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-[450px] bg-[#0b0b10] border-l border-white/10 shadow-2xl z-50 pointer-events-auto flex flex-col p-8 md:p-12 animate-slide-left">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Your Selection</h2>
              <button onClick={() => setShowCart(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <svg className="w-20 h-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-2xl font-bold italic">Your cart is currently empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-6 items-center bg-white/5 p-5 rounded-3xl border border-white/5 hover:border-gold-500/20 transition-all group">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/5">
                        <img
                          src={item.image && item.image.includes('.') ? `/food/${item.image}` : '/food/placeholder.png'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg leading-tight mb-1">{item.name}</h4>
                        <p className="text-xs text-white/40 uppercase tracking-widest font-black leading-none">{item.quantity} × Rs. {item.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gold-500 font-black text-lg">Rs. {item.price * item.quantity}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500/60 hover:text-red-500 text-[10px] font-black uppercase tracking-widest mt-2">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-white/10">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[.3em] text-white/40 mb-1">Total Amount</p>
                      <span className="text-4xl font-black text-gold-500 tracking-tighter">LKR {total.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="primary" size="lg" className="w-full py-5 text-xl font-black uppercase tracking-tighter shadow-2xl" onClick={() => {
                    const auth = localStorage.getItem('customerAuth');
                    localStorage.setItem('isCompletingOrder', 'true');

                    if (auth) {
                      navigate('/customer/dashboard');
                    } else {
                      navigate('/customer/login?redirect=/customer/dashboard');
                    }
                  }}>Complete Order</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
