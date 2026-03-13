import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

/**
 * Delivery Page - Toggle between Delivery and Takeaway
 * Restricted to Online Payment Only
 */
function Delivery() {
    const navigate = useNavigate();
    const { cart, total, clearCart, serviceCharge, subtotal, orderType, setOrderType } = useCart();
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const [details, setDetails] = useState({
        fullName: user?.user?.name || '',
        phone: user?.user?.phone || '',
        address: '',
        city: '',
        pickupTime: '',
        notes: ''
    });

    const handleInputChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleProceedToPayment = (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            setError('Please login to place an order');
            navigate('/auth');
            return;
        }

        if (cart.length === 0) {
            setError('Your cart is empty. Please select food first.');
            return;
        }

        // Basic validation
        if (orderType === 'delivery' && (!details.address || !details.city)) {
            setError('Please provide a delivery address and city');
            return;
        }
        if (orderType === 'takeaway' && !details.pickupTime) {
            setError('Please provide your estimated pickup time');
            return;
        }
        if (!details.phone || !details.fullName) {
            setError('Full name and phone number are required');
            return;
        }

        setError('');
        setShowPayment(true);
    };

    const processPayment = async () => {
        setLoading(true);
        setError('');

        try {
            // Mocking payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Transaction ID Mock
            const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();

            const token = localStorage.getItem('token');
            const endpoint = orderType === 'delivery' ? '/api/orders/delivery' : '/api/orders/takeaway';
            
            const payload = {
                customer_name: details.fullName,
                phone: details.phone,
                items: cart,
                total_price: total,
                notes: details.notes,
                payment_status: 'paid', // Req 10: backend verifies this
                transaction_id: transactionId
            };

            if (orderType === 'delivery') {
                payload.address = `${details.address}, ${details.city}`;
            } else {
                payload.pickup_time = details.pickupTime;
            }

            const response = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setPaymentSuccess(true);
                clearCart();
            } else {
                setError(data.message || 'Payment processing failed');
                setShowPayment(false);
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('❌ Payment Failed. Your order was not completed. Please try again.');
            setShowPayment(false);
        } finally {
            setLoading(false);
        }
    };

    if (paymentSuccess) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <GlassCard className="max-w-md w-full text-center p-12 border-[#D4AF37]/30 shadow-2xl">
                    <div className="text-6xl mb-6">✅</div>
                    <h2 className="text-3xl font-bold text-white mb-4">Payment Successful!</h2>
                    <p className="text-gray-400 mb-8">
                        Your order has been placed successfully.<br/>
                        We will contact you shortly.
                    </p>
                    <Button onClick={() => navigate('/account')} className="w-full bg-[#D4AF37] text-black">
                        View My Orders
                    </Button>
                </GlassCard>
            </div>
        );
    }

    if (showPayment) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <GlassCard className="max-w-2xl w-full p-8 border-[#D4AF37]/30">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        <span className="text-[#D4AF37]">02.</span> Online Payment
                    </h2>
                    
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400">Merchant</span>
                            <span className="text-white font-bold">Melissa's Food Court</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400">Order Type</span>
                            <span className="text-[#D4AF37] font-bold uppercase">{orderType}</span>
                        </div>
                        <div className="border-t border-white/10 pt-4 flex justify-between items-center text-xl font-bold">
                            <span className="text-white">Amount to Pay</span>
                            <span className="text-[#D4AF37]">Rs. {total.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <p className="text-sm text-gray-400 text-center italic">
                            Redirecting to secure payment gateway...
                        </p>
                        <div className="flex justify-center gap-4">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-8 opacity-50" alt="Visa" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-8 opacity-50" alt="Mastercard" />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1">
                            Go Back
                        </Button>
                        <Button 
                            onClick={processPayment} 
                            disabled={loading} 
                            className="flex-1 bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20"
                        >
                            {loading ? 'Processing...' : 'Proceed to Payment'}
                        </Button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-12">
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text mb-12">
                    Online Ordering System
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
                            { id: 'takeaway', icon: '🛍️', label: 'Takeaway' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setOrderType(item.id)}
                                className={`px-12 py-3 rounded-full font-bold flex items-center gap-2 transition-all duration-300 ${orderType === item.id
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
                    {/* Details Form or Select Food Button */}
                    <div className="lg:col-span-2 space-y-8">
                        {cart.length === 0 ? (
                            <GlassCard className="text-center py-20 border-dashed border-white/20">
                                <div className="text-5xl mb-6">🛒</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Your cart is empty</h3>
                                <p className="text-gray-400 mb-10">Select your favorite dishes to start your {orderType} order.</p>
                                <Button 
                                    size="lg" 
                                    onClick={() => navigate('/menu')}
                                    className="bg-[#D4AF37] text-black shadow-xl shadow-[#D4AF37]/20 px-10"
                                >
                                    Select Food
                                </Button>
                            </GlassCard>
                        ) : (
                            <>
                                <GlassCard className="animate-slide-up border-[#D4AF37]/20">
                                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                                        <span className="text-[#D4AF37]">01.</span> Fulfillment Details
                                    </h2>
                                    <form className="grid md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                                            <input
                                                name="fullName"
                                                value={details.fullName}
                                                onChange={handleInputChange}
                                                type="text" required className="input-glass w-full" placeholder="Enter your full name" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                                            <input
                                                name="phone"
                                                value={details.phone}
                                                onChange={handleInputChange}
                                                type="tel" required className="input-glass w-full" placeholder="e.g. 077 123 4567" />
                                        </div>

                                        {orderType === 'takeaway' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Pickup Time</label>
                                                <input
                                                    name="pickupTime"
                                                    value={details.pickupTime}
                                                    onChange={handleInputChange}
                                                    type="time" required className="input-glass w-full" />
                                            </div>
                                        )}

                                        {orderType === 'delivery' && (
                                            <>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Address</label>
                                                    <textarea
                                                        name="address"
                                                        value={details.address}
                                                        onChange={handleInputChange}
                                                        required
                                                        className="input-glass w-full h-20 resize-none"
                                                        placeholder="Street address, Apartment, etc."
                                                    ></textarea>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                                                    <input
                                                        name="city"
                                                        value={details.city}
                                                        onChange={handleInputChange}
                                                        type="text" required className="input-glass w-full" placeholder="e.g. Colombo 07" />
                                                </div>
                                            </>
                                        )}

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Order Notes (Optional)</label>
                                            <input
                                                name="notes"
                                                value={details.notes}
                                                onChange={handleInputChange}
                                                type="text" className="input-glass w-full" placeholder="Any special instructions?" />
                                        </div>
                                    </form>
                                </GlassCard>

                                <GlassCard className="animate-slide-up border-[#D4AF37]/20 delay-100 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white font-bold text-lg mb-1">Payment Method</h4>
                                            <p className="text-[#D4AF37] font-semibold text-sm">Online Payment Only</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-5 opacity-70" alt="Visa" />
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5 opacity-70" alt="Mastercard" />
                                        </div>
                                    </div>
                                </GlassCard>

                                <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <p className="text-gray-400">Want to add more items?</p>
                                    <Button variant="outline" onClick={() => navigate('/menu')}>
                                        Select Food
                                    </Button>
                                </div>
                            </>
                        )}
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
                                {cart.length === 0 && (
                                    <p className="text-center text-gray-500 py-4 text-sm italic">Nothing in cart yet</p>
                                )}
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
                                <div className="border-t border-white/10 pt-3 flex justify-between items-center text-xl font-bold">
                                    <span className="text-white">Total</span>
                                    <span className="text-[#D4AF37]">Rs. {total.toLocaleString()}</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleProceedToPayment}
                                className="w-full mt-8 bg-[#D4AF37] hover:bg-[#E6C86E] text-black shadow-xl shadow-[#D4AF37]/20"
                                size="lg"
                                disabled={cart.length === 0}
                            >
                                Proceed to Payment
                            </Button>
                            
                            <p className="mt-4 text-center text-[10px] text-gray-500 px-4 uppercase tracking-widest font-bold">
                                SECURE ONLINE PAYMENT
                            </p>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Delivery;
