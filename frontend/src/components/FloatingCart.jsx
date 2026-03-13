import { useState } from 'react';
import Button from './Button';
import { useCart } from '../context/CartContext';

/**
 * FloatingCart Component - Shopping cart summary panel
 * Features:
 * - Fixed position on screen
 * - Shows cart item count and total
 * - Expandable to show cart details
 * - Add/Remove items and update quantities
 */
function FloatingCart({ onCheckout }) {
    const { cart, removeFromCart, updateQuantity, total } = useCart();
    const [isExpanded, setIsExpanded] = useState(false);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItems === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {/* Expanded Cart Panel */}
            {isExpanded && (
                <div className="mb-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 w-96 max-h-[500px] overflow-y-auto animate-slide-up flex flex-col">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>🛒</span> Your Cart
                        </h3>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {cart.map((item) => (
                            <div key={item.id} className="bg-white/5 rounded-xl p-3 border border-white/5 group hover:border-[#D4AF37]/30 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-white font-bold">{item.name}</p>
                                        <p className="text-[#D4AF37] text-sm font-semibold">Rs. {item.price.toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-md transition-colors"
                                        >
                                            −
                                        </button>
                                        <span className="w-10 text-center font-bold text-white">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-md transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="text-white font-black">
                                        Rs. {(item.price * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer with Total */}
                    <div className="mt-auto space-y-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-gray-400 font-medium">Subtotal</span>
                            <span className="text-xl font-black text-[#D4AF37]">Rs. {total.toLocaleString()}</span>
                        </div>
                        <Button onClick={onCheckout} className="w-full bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20">
                            Proceed to Order Details
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Cart Button Badge */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 border-2 ${
                    isExpanded 
                    ? 'bg-white text-black border-white' 
                    : 'bg-[#D4AF37] text-black border-[#D4AF37] animate-bounce-subtle shadow-[#D4AF37]/30'
                }`}
            >
                <div className="relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 118 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {totalItems}
                    </span>
                </div>
                <span className="font-bold">Rs. {total.toLocaleString()}</span>
            </button>
        </div>
    );
}

export default FloatingCart;
