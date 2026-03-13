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
    const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, CARD, ONLINE
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

        // Basic validation
        if (mode === 'delivery' && (!details.address || !details.city)) {
            setError('Please provide a delivery address and city');
            return;
        }
        if (mode === 'dinein' && !details.tableNumber) {
            setError('Please provide your table number');
            return;
        }
        if (!details.phone || !details.contactName) {
            setError('Contact name and phone number are required');
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
                    paymentMethod: paymentMethod,
                    total: total,
                    items: cart.map(item => ({
                        id: item.id,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    // Specific details
                    address: mode === 'delivery' ? `${details.address}, ${details.city}` : null,
                    pickupTime: mode === 'takeaway' ? details.pickupTime : null,
                    tableId: mode === 'dinein' ? details.tableNumber : null,
                    contactPhone: details.phone
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(`✅ Order placed successfully! Order ID: ${data.orderId}`);
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
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text mb-12">
                    Complete Your Order
                </h1>

                {error && (
                    <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 text-center animate-slide-up">
                        <p className="text-white font-medium">❌ {error}</p>
                    </div>
                )}

                {/* Toggle Switch */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white/5 border border-white/10 rounded-full p-1.5 inline-flex flex-wrap justify-center shadow-2xl">
                        {[
                            { id: 'delivery', icon: '🚚', label: 'Delivery' },
                            { id: 'takeaway', icon: '🛍️', label: 'Takeaway' },
                            { id: 'dinein', icon: '🍽️', label: 'Dine-in' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setMode(item.id)}
                                className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all duration-300 ${mode === item.id
                                    ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/40 scale-105'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Details Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <GlassCard className="animate-slide-up border-[#D4AF37]/20">
                            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                                <span className="text-[#D4AF37]">01.</span> {mode === 'dinein' ? 'Reservation' : 'Fulfillment'} Details
                            </h2>
                            <form className="grid md:grid-cols-2 gap-6">
                                {mode === 'delivery' && (
                                    <div className="md:col-span-2 space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Address</label>
                                            <textarea
                                                name="address"
                                                value={details.address}
                                                onChange={handleInputChange}
                                                required
                                                className="input-glass w-full h-24 resize-none"
                                                placeholder="Enter your street address, apartment, etc."
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                                            <input
                                                name="city"
                                                value={details.city}
                                                onChange={handleInputChange}
                                                type="text" required className="input-glass w-full" placeholder="e.g. Colombo 07" />
                                        </div>
                                    </div>
                                )}

                                {mode === 'takeaway' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Pickup Time</label>
                                        <input
                                            name="pickupTime"
                                            value={details.pickupTime}
                                            onChange={handleInputChange}
                                            type="time" required className="input-glass w-full" />
                                        <p className="mt-2 text-xs text-gray-500 italic">Orders usually take 20-30 minutes.</p>
                                    </div>
                                )}

                                {mode === 'dinein' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Table Number</label>
                                        <input
                                            name="tableNumber"
                                            value={details.tableNumber}
                                            onChange={handleInputChange}
                                            type="number" required className="input-glass w-full" placeholder="Found on your table QR code" />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Name</label>
                                    <input
                                        name="contactName"
                                        value={details.contactName}
                                        onChange={handleInputChange}
                                        type="text" required className="input-glass w-full" placeholder="Who's ordering?" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                                    <input
                                        name="phone"
                                        value={details.phone}
                                        onChange={handleInputChange}
                                        type="tel" required className="input-glass w-full" placeholder="e.g. 077 123 4567" />
                                </div>
                            </form>
                        </GlassCard>

                        {/* Payment Selection */}
                        <GlassCard className="animate-slide-up border-[#D4AF37]/20 delay-100">
                            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                                <span className="text-[#D4AF37]">02.</span> Payment Method
                            </h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                {[
                                    { id: 'CASH', label: 'Cash / Pay at Counter', icon: '💵' },
                                    { id: 'CARD', label: 'Credit / Debit Card', icon: '💳' },
                                    { id: 'ONLINE', label: 'Online Gateway', icon: '🌐' }
                                ].map((pm) => (
                                    <button
                                        key={pm.id}
                                        onClick={() => setPaymentMethod(pm.id)}
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === pm.id
                                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/30'
                                            }`}
                                    >
                                        <span className="text-3xl">{pm.icon}</span>
                                        <span className={`text-sm font-bold ${paymentMethod === pm.id ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
                                            {pm.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <GlassCard className="animate-slide-up h-fit border-[#D4AF37]/20 sticky top-24">
                            <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Order Summary</h2>

                            <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-start text-sm">
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{item.name}</p>
                                            <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                                        </div>
                                        <span className="text-[#D4AF37] font-semibold">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 bg-white/5 p-4 rounded-xl">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span className="text-white">Rs. {subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Service Charge (10%)</span>
                                    <span className="text-white">Rs. {serviceCharge.toLocaleString()}</span>
                                </div>
                                {mode === 'delivery' && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Delivery Fee</span>
                                        <span className="text-green-400">FREE</span>
                                    </div>
                                )}
                                <div className="border-t border-white/10 pt-3 flex justify-between items-center text-xl font-bold">
                                    <span className="text-white">Total</span>
                                    <span className="text-[#D4AF37]">Rs. {total.toLocaleString()}</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleCheckout}
                                className="w-full mt-8 bg-[#D4AF37] hover:bg-[#E6C86E] text-black shadow-xl shadow-[#D4AF37]/20"
                                size="lg"
                                disabled={loading || cart.length === 0}
                            >
                                {loading ? 'Processing...' : `Place ${mode === 'dinein' ? 'Dine-in' : mode.charAt(0).toUpperCase() + mode.slice(1)} Order`}
                            </Button>
                            
                            <p className="mt-4 text-center text-[10px] text-gray-500 px-4">
                                By placing this order, you agree to our Terms of Service and Privacy Policy.
                            </p>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Delivery;
