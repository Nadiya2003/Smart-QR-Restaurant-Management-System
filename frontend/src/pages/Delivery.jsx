import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import config from '../config';

/**
 * Delivery Page - Toggle between Delivery and Takeaway
 * Restricted to Online Payment Only
 */
function Delivery() {
    const navigate = useNavigate();
    const { cart, total, clearCart, serviceCharge, subtotal, orderType, setOrderType } = useCart();
    const { user, isAuthenticated, refreshUser } = useAuth();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [orderId, setOrderId] = useState(null);

    const [details, setDetails] = useState({
        fullName: user?.user?.name || '',
        phone: user?.user?.phone || '',
        address: '',
        city: '',
        pickupTime: '',
        deliveryTime: '',
        notes: ''
    });

    const [cardDetails, setCardDetails] = useState({
        number: '',
        name: '',
        expiry: '',
        cvv: ''
    });

    const handleInputChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleCardChange = (e) => {
        let value = e.target.value;
        if (e.target.name === 'number') {
            value = value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim().substring(0, 19);
        }
        if (e.target.name === 'expiry') {
            value = value.replace(/\W/gi, '').replace(/(.{2})/g, '$1/').trim().substring(0, 5);
            if (value.endsWith('/')) value = value.substring(0, value.length - 1);
        }
        if (e.target.name === 'cvv') {
            value = value.replace(/\D/g, '').substring(0, 3);
        }
        setCardDetails({ ...cardDetails, [e.target.name]: value });
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

        // 12 AM to 9 PM Order Placement Window Validation
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMins = currentHour * 60 + currentMinute;
        
        const orderPlacementStartMins = 0; // 12:00 AM (Midnight)
        const orderPlacementEndMins = 21 * 60; // 9:00 PM
        
        // Fulfillment bounds (Delivery & Pickup only happen during open hours)
        const openMins = 11 * 60; // 11:00 AM
        const closeMins = 21 * 60; // 9:00 PM

        if (currentTimeInMins >= orderPlacementEndMins) {
            setError('We are currently closed. Orders for today can only be placed between 12:00 AM and 9:00 PM.');
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
        
        if (orderType === 'takeaway' && details.pickupTime) {
            const [selHr, selMin] = details.pickupTime.split(':').map(Number);
            const selTotalMins = selHr * 60 + selMin;
            if (selTotalMins < openMins || selTotalMins >= closeMins) {
                setError('Pickup time must be between 11:00 AM and 9:00 PM.');
                return;
            }
            if (selTotalMins < currentTimeInMins) {
                setError('Pickup time cannot be in the past.');
                return;
            }
        }

        if (orderType === 'delivery' && !details.deliveryTime) {
            setError('Please provide your expected delivery time');
            return;
        }

        if (orderType === 'delivery' && details.deliveryTime) {
            const [selHr, selMin] = details.deliveryTime.split(':').map(Number);
            const selTotalMins = selHr * 60 + selMin;
            if (selTotalMins < openMins || selTotalMins >= closeMins) {
                setError('Delivery time must be between 11:00 AM and 9:00 PM.');
                return;
            }
            if (selTotalMins < currentTimeInMins) {
                setError('Delivery time cannot be in the past.');
                return;
            }
        }

        if (!details.phone || !details.fullName) {
            setError('Full name and phone number are required');
            return;
        }

        setError('');
        setShowPayment(true);
    };

    const processPayment = async () => {
        if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length !== 16) {
            setError('Valid 16-digit card number is required');
            return;
        }

        if (!cardDetails.expiry || !cardDetails.expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
            setError('Valid expiry date in MM/YY format is required');
            return;
        }

        const [month, year] = cardDetails.expiry.split('/');
        const expiryDate = new Date(2000 + parseInt(year), parseInt(month));
        const today = new Date();
        if (expiryDate < today) {
            setError('Your card has expired');
            return;
        }

        if (!cardDetails.cvv || cardDetails.cvv.length !== 3) {
            setError('Valid 3-digit CVV is required');
            return;
        }

        if (!cardDetails.name) {
            setError('Cardholder name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Mocking payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Transaction ID Mock
            const transactionId = 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase();

            const token = sessionStorage.getItem('token');
            const endpoint = orderType === 'delivery' ? '/api/orders/delivery' : '/api/orders/takeaway';
            
            const payload = {
                customer_id: user?.user?.id,
                customer_name: details.fullName,
                phone: details.phone,
                items: cart,
                total_price: total,
                notes: details.notes,
                payment_status: 'paid',
                transaction_id: transactionId
            };

            if (orderType === 'delivery') {
                payload.address = `${details.address}, ${details.city}`;
                payload.delivery_time = details.deliveryTime;
            } else {
                payload.pickup_time = details.pickupTime;
            }

            const response = await fetch(`${config.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setOrderId(data.orderId);
                setPaymentSuccess(true);
                await refreshUser();
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
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
                <GlassCard className="max-w-md w-full text-center p-12 border-[#D4AF37]/30 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D4AF37] to-[#B8860B]"></div>
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
                        ✅
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
                    <div className="bg-[#D4AF37]/10 rounded-xl p-4 mb-6 border border-[#D4AF37]/20">
                        <p className="text-[#D4AF37] text-sm uppercase tracking-wider mb-1">Order ID</p>
                        <p className="text-white text-2xl font-mono font-bold">#MFC-{orderId || Math.floor(Math.random() * 90000) + 10000}</p>
                    </div>
                    <p className="text-gray-400 mb-8 px-4">
                        Your order has been placed successfully. Estimated preparation time is <span className="text-white font-bold">25-35 minutes</span>.
                    </p>
                    <div className="space-y-3">
                        <Button onClick={() => navigate('/menu')} className="w-full bg-[#D4AF37] text-black font-bold">
                            Order More
                        </Button>
                        <Button onClick={() => navigate('/account')} variant="outline" className="w-full border-white/10 text-gray-400">
                            Track Order Status
                        </Button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    if (showPayment) {
        const banks = [
            { name: 'Commercial', logoCls: 'bg-[#0054A6]/10 text-[#0054A6]' },
            { name: 'Sampath', logoCls: 'bg-[#ED1C24]/10 text-[#ED1C24]' },
            { name: 'HNB', logoCls: 'bg-[#FDB913]/10 text-[#FDB913]' },
            { name: 'BOC', logoCls: 'bg-[#FFCC00]/10 text-[#000000]' },
            { name: 'People\'s Bank', logoCls: 'bg-[#800000]/10 text-[#800000]' },
            { name: 'Seylan', logoCls: 'bg-[#000000]/10 text-[#E31E24]' },
            { name: 'NDB', logoCls: 'bg-[#003B71]/10 text-[#003B71]' },
            { name: 'NTB', logoCls: 'bg-[#EE4122]/10 text-[#EE4122]' }
        ];

        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
                <GlassCard className="max-w-2xl w-full p-8 border-[#D4AF37]/30 shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="text-[#D4AF37]">02.</span> Secure Checkout
                        </h2>
                        <div className="flex gap-2">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-4" alt="Visa" />
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4" alt="Mastercard" />
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-10">
                        {/* Summary Section */}
                        <div className="space-y-6">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-4">Payment Summary</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Order Amount</span>
                                        <span className="text-white">Rs. {subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Taxes & Fees</span>
                                        <span className="text-white">Rs. {serviceCharge.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xl font-bold">
                                        <span className="text-white">Total</span>
                                        <span className="text-[#D4AF37]">Rs. {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold px-1">Supported SL Banks</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {banks.map(bank => (
                                        <div key={bank.name} className={`text-[10px] px-3 py-2 rounded-lg border border-white/5 font-bold truncate flex items-center gap-2 ${bank.logoCls}`}>
                                            <span className="w-1 h-3 rounded-full bg-current"></span>
                                            {bank.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Card Form */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Card Number</label>
                                <input 
                                    type="text" name="number" value={cardDetails.number} onChange={handleCardChange}
                                    className="input-glass w-full text-lg tracking-widest font-mono" placeholder="4532 1122 8899 7766" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Cardholder Name</label>
                                <input 
                                    type="text" name="name" value={cardDetails.name} onChange={handleCardChange}
                                    className="input-glass w-full" placeholder="NAME ON CARD" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Expiry</label>
                                    <input 
                                        type="text" name="expiry" value={cardDetails.expiry} onChange={handleCardChange}
                                        className="input-glass w-full text-center font-mono" placeholder="MM/YY" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">CVV</label>
                                    <input 
                                        type="password" name="cvv" value={cardDetails.cvv} onChange={handleCardChange}
                                        className="input-glass w-full text-center font-mono" placeholder="***" 
                                    />
                                </div>
                            </div>

                            <Button 
                                onClick={processPayment} 
                                disabled={loading} 
                                className="w-full bg-[#D4AF37] text-black font-bold h-14 text-lg mt-4 shadow-xl shadow-[#D4AF37]/20"
                            >
                                {loading ? 'Authorizing...' : 'Pay with Card'}
                            </Button>
                            
                            <button 
                                onClick={() => setShowPayment(false)}
                                className="w-full text-sm text-gray-500 hover:text-white transition-colors"
                            >
                                Cancel and return
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-12">
            <div className="container mx-auto max-w-5xl">
                <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text mb-12">
                    Online Order Portal
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
                    {/* Details Form */}
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
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Pickup Time (11:00 AM - 9:00 PM)</label>
                                                <input
                                                    name="pickupTime"
                                                    value={details.pickupTime}
                                                    onChange={handleInputChange}
                                                    min="11:00"
                                                    max="21:00"
                                                    type="time" required className="input-glass w-full" />
                                            </div>
                                        )}

                                        {orderType === 'delivery' && (
                                            <>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-300 mb-2">Expected Delivery Time (11:00 AM - 9:00 PM)</label>
                                                    <input
                                                        name="deliveryTime"
                                                        value={details.deliveryTime}
                                                        onChange={handleInputChange}
                                                        min="11:00"
                                                        max="21:00"
                                                        type="time" required className="input-glass w-full" />
                                                </div>
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
                                            <p className="text-[#D4AF37] font-semibold text-sm">SECURE ONLINE PAYMENT</p>
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
                                className="w-full mt-8 bg-[#D4AF37] hover:bg-[#E6C86E] text-black shadow-xl shadow-[#D4AF37]/20 font-bold"
                                size="lg"
                                disabled={cart.length === 0}
                            >
                                Proceed to Payment
                            </Button>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Delivery;
