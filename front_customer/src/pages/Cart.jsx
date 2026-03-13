import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function Cart() {
    const navigate = useNavigate();
    const { isCustomerLoggedIn } = useCustomer();
    const [cart, setCart] = useState([]);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    const updateQuantity = (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            removeItem(itemId);
            return;
        }
        const newCart = cart.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    const removeItem = (itemId) => {
        const newCart = cart.filter(item => item.id !== itemId);
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleConfirmOrder = () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        setShowConfirmation(true);
    };

    const handleProceedToPayment = () => {
        if (!isCustomerLoggedIn) {
            // Save redirect path
            navigate('/customer/login?redirect=/customer/dashboard');
        } else {
            navigate('/customer/payment-selection');
        }
    };

    const total = calculateTotal();

    return (
        <div className="min-h-screen bg-dark-gradient px-4 py-12">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-gray-400 hover:text-gold-500 mb-4 flex items-center gap-2 font-bold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Continue Shopping
                    </button>
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-gold-200 to-white bg-clip-text text-transparent tracking-tighter">
                        Your Cart
                    </h1>
                </div>

                {cart.length === 0 ? (
                    <GlassCard className="p-12 text-center">
                        <div className="text-6xl mb-6">🛒</div>
                        <h2 className="text-2xl font-black text-white mb-4">Your Cart is Empty</h2>
                        <p className="text-gray-400 mb-8">Add some delicious items to get started</p>
                        <Button onClick={() => navigate('/customer/menu-category')}>
                            Browse Menu
                        </Button>
                    </GlassCard>
                ) : (
                    <div className="space-y-8">
                        {/* Cart Items */}
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <GlassCard key={item.id} className="p-6">
                                    <div className="flex items-center gap-6">
                                        <img
                                            src={item.image ? `http://192.168.1.3:5000/food/${item.image}` : '/placeholder-food.png'}
                                            alt={item.name}
                                            className="w-24 h-24 object-cover rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <h3 className="text-xl font-black text-white">{item.name}</h3>
                                            <p className="text-gold-500 font-bold">Rs. {item.price?.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="text-gold-500 hover:text-gold-400 font-black text-xl"
                                                >
                                                    −
                                                </button>
                                                <span className="text-white font-black text-lg w-8 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="text-gold-500 hover:text-gold-400 font-black text-xl"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="text-red-500 hover:text-red-400 p-2"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>

                        {/* Total & Actions */}
                        <GlassCard className="p-8 border-gold-500/30">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-2xl">
                                    <span className="font-black text-white">Total Amount:</span>
                                    <span className="font-black text-gold-500">Rs. {total.toLocaleString()}</span>
                                </div>
                                <Button
                                    onClick={handleConfirmOrder}
                                    className="w-full py-4 text-lg font-black"
                                >
                                    Confirm Order
                                </Button>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Order Confirmation Modal */}
                {showConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <GlassCard className="max-w-2xl w-full p-10 border-gold-500/50">
                            <h2 className="text-3xl font-black text-white mb-6 text-center">Order Summary</h2>

                            <div className="space-y-4 mb-8">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex justify-between text-gray-300">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span className="font-bold">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="border-t border-white/10 pt-4 flex justify-between text-xl font-black">
                                    <span className="text-white">Total:</span>
                                    <span className="text-gold-500">Rs. {total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleProceedToPayment}
                                    className="flex-1 font-black"
                                >
                                    Proceed to Payment
                                </Button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Cart;
