import { useState } from 'react';
import Button from './Button';

/**
 * FloatingCart Component - Shopping cart summary panel
 * Features:
 * - Fixed position on screen
 * - Shows cart item count and total
 * - Expandable to show cart details
 * - Remove items functionality
 */
function FloatingCart({ cart, onRemoveItem, onCheckout }) {
    // State to manage cart panel expansion
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate total price
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Calculate total items
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItems === 0) {
        return null; // Don't show cart if empty
    }

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {/* Expanded Cart Panel */}
            {isExpanded && (
                <div className="mb-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 w-80 max-h-96 overflow-y-auto animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Your Cart</h3>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="space-y-3 mb-4">
                        {cart.map((item) => (
                            <div key={item.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-white font-medium text-sm">{item.name}</p>
                                    <p className="text-gray-400 text-xs">
                                        Rs. {item.price.toLocaleString()} × {item.quantity}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#D4AF37] font-bold text-sm">
                                        Rs. {(item.price * item.quantity).toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="text-red-400 hover:text-red-300 text-xs"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="border-t border-white/10 pt-3 mb-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-white">Total:</span>
                            <span className="text-[#D4AF37]">Rs. {totalPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Checkout Button */}
                    <Button onClick={onCheckout} className="w-full">
                        Proceed to Checkout
                    </Button>
                </div>
            )}

            {/* Floating Cart Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-[#D4AF37] hover:bg-[#E6C86E] text-black font-bold px-6 py-4 rounded-full shadow-lg hover:shadow-[#D4AF37]/50 transition-all duration-300 hover:scale-110 flex items-center gap-3"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
                <span>{totalItems} Items - Rs. {totalPrice.toLocaleString()}</span>
            </button>
        </div>
    );
}

export default FloatingCart;
