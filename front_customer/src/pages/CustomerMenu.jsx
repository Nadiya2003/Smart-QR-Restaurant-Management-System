import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

/**
 * CustomerMenu - Browse food items and manage cart
 * Features: Category filtering, add to cart, floating cart display
 */
export default function CustomerMenu() {
  const [selectedCategory, setSelectedCategory] = useState('sriLankan');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  // Menu items database
  const menuItems = {
    sriLankan: [
      { id: 1, name: 'Kottu Roti', price: 850, emoji: '🥘' },
      { id: 2, name: 'Lamprais', price: 950, emoji: '🍚' },
      { id: 3, name: 'Hoppers', price: 650, emoji: '🥣' },
      { id: 4, name: 'Deviled Chicken', price: 780, emoji: '🍗' },
      { id: 5, name: 'Fish Curry', price: 1200, emoji: '🐟' },
      { id: 6, name: 'Pol Sambol', price: 450, emoji: '🥬' },
    ],
    italian: [
      { id: 7, name: 'Spaghetti Carbonara', price: 1200, emoji: '🍝' },
      { id: 8, name: 'Fettuccine Alfredo', price: 1100, emoji: '🍝' },
      { id: 9, name: 'Risotto ai Funghi', price: 1300, emoji: '🍚' },
      { id: 10, name: 'Lasagna Bolognese', price: 1400, emoji: '🍲' },
      { id: 11, name: 'Panna Cotta', price: 650, emoji: '🍮' },
      { id: 12, name: 'Tiramisu', price: 750, emoji: '🎂' },
    ],
  };

  // Get current category items
  const currentItems = selectedCategory === 'sriLankan'
    ? menuItems.sriLankan
    : menuItems.italian;

  // Add item to cart
  const addToCart = (item) => {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
      setCart(cart.map(i =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060606] via-[#0b0b10] to-[#101018] text-white md:ml-64 p-4 md:p-8 pb-32 md:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🍽️ Menu</h1>
          <p className="text-gray-400">Explore our delicious dishes</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory('sriLankan')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${selectedCategory === 'sriLankan'
              ? 'bg-gold-500 text-black shadow-lg'
              : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
          >
            🇱🇰 Sri Lankan
          </button>
          <button
            onClick={() => setSelectedCategory('italian')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${selectedCategory === 'italian'
              ? 'bg-gold-500 text-black shadow-lg'
              : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
          >
            🇮🇹 Italian
          </button>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {currentItems.map(item => (
            <GlassCard key={item.id} className="hover:bg-white/10 transition-all">
              <div className="text-center">
                {/* Item Emoji */}
                <div className="text-5xl mb-4">{item.emoji}</div>

                {/* Item Name */}
                <h3 className="text-xl font-bold mb-2">{item.name}</h3>

                {/* Price in Gold */}
                <div className="mb-4">
                  <p className="text-2xl font-bold text-gold-500">Rs. {item.price}</p>
                </div>

                {/* Add to Cart Button */}
                <Button
                  variant="primary"
                  onClick={() => addToCart(item)}
                  className="w-full"
                >
                  Add to Cart
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      <button
        onClick={() => setShowCart(!showCart)}
        className="fixed bottom-20 md:bottom-8 right-8 bg-gold-500 text-black px-6 py-3 rounded-full font-bold shadow-lg hover:bg-gold-400 transition-all text-lg z-30"
      >
        🛒 {cart.length}
      </button>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed bottom-0 right-0 top-0 w-full md:w-96 bg-gradient-to-b from-[#060606] via-[#0b0b10] to-[#101018] border-l border-gold-500/30 shadow-2xl z-40 overflow-y-auto p-6 md:p-8">
          {/* Close Button */}
          <button
            onClick={() => setShowCart(false)}
            className="mb-6 text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold mb-6 text-gold-500">Your Cart</h2>

          {cart.length === 0 ? (
            <p className="text-gray-400">Your cart is empty</p>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-4 mb-8">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">{item.emoji} {item.name}</p>
                      <p className="text-sm text-gray-400">
                        {item.quantity} × Rs. {item.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gold-500 font-bold">
                        Rs. {item.price * item.quantity}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-400 text-sm mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-gold-500/30 pt-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg">Total:</span>
                  <span className="text-2xl font-bold text-gold-500">Rs. {total}</span>
                </div>
                <Button variant="primary" className="w-full mb-2">
                  Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
