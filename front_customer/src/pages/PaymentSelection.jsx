import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function PaymentSelection() {
    const navigate = useNavigate();
    const { customerData, selectedSteward } = useCustomer();
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Online Payment Form States
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleOnlinePayment = async () => {
        if (!accountNumber || !bankName) {
            alert('Please fill in all payment details');
            return;
        }

        setProcessing(true);

        try {
            // Get auth token
            const auth = JSON.parse(localStorage.getItem('customerAuth') || '{}');

            if (!auth.token) {
                alert('Authentication required. Please login again.');
                navigate('/customer/login');
                return;
            }

            // Create order
            const orderResponse = await fetch('http://192.168.1.3:5000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}` // Add auth token
                },
                body: JSON.stringify({
                    customerId: customerData.id,
                    stewardId: selectedSteward?.id,
                    orderType: 'DINE_IN',
                    paymentMethod: 'online',
                    total: total,
                    items: cart
                })
            });

            if (!orderResponse.ok) {
                const errorData = await orderResponse.json();
                throw new Error(errorData.message || 'Order creation failed');
            }

            const orderData = await orderResponse.json();

            // Clear cart
            localStorage.removeItem('cart');

            // Show success and redirect
            alert(`✅ Payment Successful!\n\nOrder #${orderData.orderId} confirmed.\nTotal: Rs. ${total.toLocaleString()}`);
            navigate('/customer/dashboard');

        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleCardCashPayment = async (method) => {
        setProcessing(true);

        try {
            // Get auth token
            const auth = JSON.parse(localStorage.getItem('customerAuth') || '{}');

            if (!auth.token) {
                alert('Authentication required. Please login again.');
                navigate('/customer/login');
                return;
            }

            // Create order with COD status
            const orderResponse = await fetch('http://192.168.1.3:5000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.token}` // Add auth token
                },
                body: JSON.stringify({
                    customerId: customerData.id,
                    stewardId: selectedSteward?.id,
                    orderType: 'DINE_IN',
                    paymentMethod: 'cod',
                    total: total,
                    items: cart
                })
            });

            if (!orderResponse.ok) {
                const errorData = await orderResponse.json();
                throw new Error(errorData.message || 'Order creation failed');
            }

            const orderData = await orderResponse.json();

            // Send notification to steward
            await fetch('http://192.168.1.3:5000/api/staff/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stewardId: selectedSteward?.id,
                    message: `Payment request from ${customerData.name} - Order #${orderData.orderId} - Method: ${method} - Amount: Rs. ${total.toLocaleString()}`,
                    type: 'PAYMENT_REQUEST'
                })
            });

            // Clear cart
            localStorage.removeItem('cart');

            // Show success message
            alert(`✅ Order Confirmed!\n\nOrder #${orderData.orderId} placed.\nYour steward will collect ${method} payment.`);
            navigate('/customer/dashboard');

        } catch (error) {
            console.error('Payment error:', error);
            alert('Failed to process request: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-gradient px-4 py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-gold-200 to-white bg-clip-text text-transparent tracking-tighter mb-4">
                        Select Payment Method
                    </h1>
                    <p className="text-gray-400 text-lg">Total Amount: <span className="text-gold-500 font-black">Rs. {total.toLocaleString()}</span></p>
                </div>

                {/* Payment Method Selection */}
                {!selectedMethod && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Online Payment */}
                        <GlassCard
                            className="p-8 cursor-pointer hover:border-gold-500/50 transition-all group"
                            onClick={() => setSelectedMethod('online')}
                        >
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-gold-500/20 transition-all">
                                    <svg className="w-10 h-10 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-black text-white group-hover:text-gold-500 transition-colors">
                                    Online Payment
                                </h3>
                                <p className="text-gray-400 text-sm">Pay securely with your bank account</p>
                            </div>
                        </GlassCard>

                        {/* Card / Cash Payment */}
                        <GlassCard
                            className="p-8 cursor-pointer hover:border-gold-500/50 transition-all group"
                            onClick={() => setSelectedMethod('cardcash')}
                        >
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-gold-500/20 transition-all">
                                    <svg className="w-10 h-10 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-black text-white group-hover:text-gold-500 transition-colors">
                                    Card / Cash
                                </h3>
                                <p className="text-gray-400 text-sm">Pay with card or cash via steward</p>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Online Payment Form */}
                {selectedMethod === 'online' && (
                    <GlassCard className="p-8 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-black text-white mb-6">Online Payment Details</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-400 font-bold mb-2">Account Number</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-gold-500 outline-none"
                                    placeholder="Enter account number"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 font-bold mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-gold-500 outline-none"
                                    placeholder="Enter bank name"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 font-bold mb-2">Amount</label>
                                <input
                                    type="text"
                                    value={`Rs. ${total.toLocaleString()}`}
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gold-500 font-black"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedMethod(null)}
                                    disabled={processing}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleOnlinePayment}
                                    disabled={processing}
                                    className="flex-1 font-black"
                                >
                                    {processing ? 'Processing...' : 'Confirm Payment'}
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {/* Card/Cash Selection */}
                {selectedMethod === 'cardcash' && (
                    <GlassCard className="p-8 max-w-2xl mx-auto">
                        <h2 className="text-2xl font-black text-white mb-6 text-center">Choose Payment Type</h2>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <Button
                                onClick={() => handleCardCashPayment('CARD')}
                                disabled={processing}
                                className="py-4 font-black"
                            >
                                Pay by Card
                            </Button>
                            <Button
                                onClick={() => handleCardCashPayment('CASH')}
                                disabled={processing}
                                variant="outline"
                                className="py-4 font-black"
                            >
                                Pay by Cash
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedMethod(null)}
                            disabled={processing}
                            className="w-full"
                        >
                            Back
                        </Button>
                        <p className="text-gray-400 text-sm text-center mt-6">
                            Your steward <span className="text-gold-500 font-bold">{selectedSteward?.name}</span> will be notified to collect payment
                        </p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}

export default PaymentSelection;
