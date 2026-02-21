import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

/**
 * Delivery Page - Toggle between Delivery, Takeaway, and Dine-in
 */
function Delivery() {
    const navigate = useNavigate();
    const { cart, total, clearCart, serviceCharge, subtotal } = useCart();
    const { user, isAuthenticated } = useAuth();

    // 'delivery', 'takeaway', or 'dinein'
    const [mode, setMode] = useState('delivery');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [details, setDetails] = useState({
        address: '',
        city: '',
        phone: user?.user?.phone || '',
        pickupTime: '',
        contactName: user?.user?.name || '',
        tableNumber: ''
    });

    const handleInputChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleCheckout = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            setError('Please login to place an order');
            navigate('/auth');
            return;
        }

        if (cart.length === 0) {
            setError('Your cart is empty');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerId: user.user.id,
                    orderType: mode === 'dinein' ? 'DINE_IN' : mode.toUpperCase(),
                    paymentMethod: 'CASH', // Defaulting to Cash/Pay at Counter
                    total: total,
                    items: cart.map(item => ({
                        id: item.id,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    // Specific details could be handled by backend or stored in a generic 'metadata' column
                    // For now, we follow the base schema.
                    tableId: mode === 'dinein' ? details.tableNumber : null
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Order placed successfully for ${mode}! Order ID: ${data.orderId}`);
                clearCart();
                navigate('/account');
            } else {
                setError(data.message || 'Failed to place order');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-12">
            <div className="container mx-auto max-w-4xl">
                <h1 className="text-4xl font-bold text-center text-white mb-8">Complete Order</h1>

                {error && (
                    <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 text-center">
                        <p className="text-white font-medium">❌ {error}</p>
                    </div>
                )}

                {/* Toggle Switch */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white/10 rounded-full p-1 inline-flex flex-wrap justify-center">
                        <button
                            onClick={() => setMode('delivery')}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${mode === 'delivery'
                                ? 'bg-[#D4AF37] text-black shadow-lg'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Delivery
                        </button>
                        <button
                            onClick={() => setMode('takeaway')}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${mode === 'takeaway'
                                ? 'bg-[#D4AF37] text-black shadow-lg'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Takeaway
                        </button>
                        <button
                            onClick={() => setMode('dinein')}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${mode === 'dinein'
                                ? 'bg-[#D4AF37] text-black shadow-lg'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Dine-in
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Details Form */}
                    <GlassCard className="animate-slide-up">
                        <h2 className="text-xl font-bold text-white mb-6 capitalize">{mode} Details</h2>
                        <form className="space-y-4">
                            {mode === 'delivery' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Address</label>
                                        <textarea
                                            name="address"
                                            value={details.address}
                                            onChange={handleInputChange}
                                            required
                                            className="input-glass w-full h-24 resize-none"
                                            placeholder="Enter full address"
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                                        <input
                                            name="city"
                                            value={details.city}
                                            onChange={handleInputChange}
                                            type="text" required className="input-glass w-full" placeholder="e.g. Colombo" />
                                    </div>
                                </>
                            )}

                            {mode === 'takeaway' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Pickup Time</label>
                                        <input
                                            name="pickupTime"
                                            value={details.pickupTime}
                                            onChange={handleInputChange}
                                            type="time" required className="input-glass w-full" />
                                    </div>
                                </>
                            )}

                            {mode === 'dinein' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Table Number</label>
                                        <input
                                            name="tableNumber"
                                            value={details.tableNumber}
                                            onChange={handleInputChange}
                                            type="number" required className="input-glass w-full" placeholder="Table # e.g. 5" />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Contact Name</label>
                                <input
                                    name="contactName"
                                    value={details.contactName}
                                    onChange={handleInputChange}
                                    type="text" required className="input-glass w-full" placeholder="Your name" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                                <input
                                    name="phone"
                                    value={details.phone}
                                    onChange={handleInputChange}
                                    type="tel" required className="input-glass w-full" placeholder="077 123 4567" />
                            </div>
                        </form>
                    </GlassCard>

                    {/* Order Summary */}
                    <GlassCard className="animate-slide-up h-fit">
                        <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300">{item.name} x {item.quantity}</span>
                                    <span className="text-white">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-white/10 my-4"></div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Subtotal</span>
                                <span className="text-white">Rs. {subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Service Charge (10%)</span>
                                <span className="text-white">Rs. {serviceCharge.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-white/10 my-2"></div>
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span className="text-white">Total</span>
                                <span className="text-[#D4AF37]">Rs. {total.toLocaleString()}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleCheckout}
                            className="w-full mt-6"
                            disabled={loading || cart.length === 0}
                        >
                            {loading ? 'Processing...' : `Place ${mode === 'dinein' ? 'Dine-in' : mode} Order`}
                        </Button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default Delivery;
