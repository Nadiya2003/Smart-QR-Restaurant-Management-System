import { useState } from 'react';
import GlassCard from './GlassCard';
import Button from './Button';

const PaymentModal = ({ order, onClose, onPaymentComplete }) => {
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const paymentMethods = [
        { id: 'ONLINE', name: 'Online Banking', icon: '\ud83c\udfe6', description: 'Pay via online banking' },
        { id: 'CARD', name: 'Credit/Debit Card', icon: '\ud83d\udcb3', description: 'Pay using your card' },
        { id: 'CASH', name: 'Cash Payment', icon: '\ud83d\udcb5', description: 'Pay when order is delivered' },
    ];

    const handlePayment = async () => {
        if (!paymentMethod) return;

        setProcessing(true);
        try {
            const response = await fetch('http://localhost:5000/api/payment/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    paymentMethod,
                    amount: order.total_amount
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    onPaymentComplete(data);
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Payment error:', error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <GlassCard className="max-w-md w-full p-8">
                {success ? (
                    <div className="text-center">
                        <div className="text-6xl mb-4">\u2705</div>
                        <h2 className="text-2xl font-bold text-[#D4AF37] mb-2">Payment Successful!</h2>
                        <p className="text-gray-400">Your order has been confirmed</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-[#D4AF37]">Complete Payment</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">\u00d7</button>
                        </div>

                        <div className="mb-6 p-4 bg-white/5 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400">Order #{order.id}</span>
                                <span className="text-sm text-gray-500">{order.status}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-lg">Total Amount:</span>
                                <span className="text-2xl font-bold text-[#D4AF37]">Rs. {order.total_amount}</span>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-sm text-gray-400 mb-3">Select Payment Method:</p>
                            {paymentMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${paymentMethod === method.id
                                            ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                                            : 'bg-white/5 border-2 border-white/10 hover:border-[#D4AF37]/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{method.icon}</span>
                                        <div>
                                            <p className="font-semibold text-white">{method.name}</p>
                                            <p className="text-xs text-gray-400">{method.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="primary"
                            onClick={handlePayment}
                            disabled={!paymentMethod || processing}
                            className="w-full"
                        >
                            {processing ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </>
                )}
            </GlassCard>
        </div>
    );
};

export default PaymentModal;
