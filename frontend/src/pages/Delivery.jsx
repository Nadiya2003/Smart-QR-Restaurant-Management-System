import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

/**
 * Delivery Page - Toggle between Delivery and Takeaway
 * Features:
 * - Address input for Delivery
 * - Time picker for Takeaway
 * - Order summary
 * - Mock checkout functionality
 */
function Delivery() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('delivery'); // 'delivery' or 'takeaway'

    const handleCheckout = (e) => {
        e.preventDefault();
        alert(`Order placed successfully for ${mode === 'delivery' ? 'Delivery' : 'Takeaway'}!`);
        navigate('/');
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-12">
            <div className="container mx-auto max-w-3xl">
                <h1 className="text-4xl font-bold text-center text-white mb-8">Checkout</h1>

                {/* Toggle Switch */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white/10 rounded-full p-1 inline-flex">
                        <button
                            onClick={() => setMode('delivery')}
                            className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${mode === 'delivery'
                                    ? 'bg-[#D4AF37] text-black shadow-lg'
                                    : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Delivery
                        </button>
                        <button
                            onClick={() => setMode('takeaway')}
                            className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${mode === 'takeaway'
                                    ? 'bg-[#D4AF37] text-black shadow-lg'
                                    : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Takeaway
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Details Form */}
                    <GlassCard className="animate-slide-up">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {mode === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
                        </h2>
                        <form onSubmit={handleCheckout} className="space-y-4">
                            {mode === 'delivery' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Address</label>
                                        <textarea
                                            required
                                            className="input-glass w-full h-32 resize-none"
                                            placeholder="Enter full address"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                                        <input type="text" required className="input-glass w-full" placeholder="e.g. Colombo" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Pickup Time</label>
                                        <input type="time" required className="input-glass w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Contact Name</label>
                                        <input type="text" required className="input-glass w-full" placeholder="Your name" />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                                <input type="tel" required className="input-glass w-full" placeholder="077 123 4567" />
                            </div>
                        </form>
                    </GlassCard>

                    {/* Order Summary */}
                    <GlassCard className="animate-slide-up h-fit">
                        <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6">
                            {/* Mock items for display */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Chicken Kottu x 1</span>
                                <span className="text-white">Rs. 1,200</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Coca Cola x 2</span>
                                <span className="text-white">Rs. 400</span>
                            </div>

                            <div className="border-t border-white/10 my-4"></div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Subtotal</span>
                                <span className="text-white">Rs. 1,600</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Service Charge (10%)</span>
                                <span className="text-white">Rs. 160</span>
                            </div>

                            <div className="border-t border-white/10 my-4"></div>

                            <div className="flex justify-between items-center text-lg font-bold">
                                <span className="text-white">Total</span>
                                <span className="text-[#D4AF37]">Rs. 1,760</span>
                            </div>
                        </div>

                        <Button onClick={handleCheckout} className="w-full">
                            {mode === 'delivery' ? 'Place Delivery Order' : 'Confirm Pickup'}
                        </Button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default Delivery;
