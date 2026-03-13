import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function Payments() {
  const navigate = useNavigate();
  const { customerData, selectedSteward } = useCustomer();
  const [cart, setCart] = useState([]);
  const [view, setView] = useState('checkout'); // 'checkout', 'history'
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payment Module State
  const [selectedMethod, setSelectedMethod] = useState(null); // null, 'online', 'cardcash'
  const [processing, setProcessing] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  // 1. Load Data
  useEffect(() => {
    const savedCart = localStorage.getItem('customerCart'); // Assuming consistent key, checking other files used 'customerCart'? 
    // Wait, Cart.jsx used 'cart' key in localStorage (Line 14 of Cart.jsx: localStorage.getItem('cart'))
    // CustomerDashboard.jsx used 'customerCart' in line 22? Wait.
    // Let me check Cart.jsx again. Cart.jsx uses 'cart'.
    // CustomerDashboard.jsx used 'customerCart' in the removed block.
    // I should use 'cart' to be consistent with Cart.jsx

    const cartData = localStorage.getItem('cart');
    if (cartData) {
      setCart(JSON.parse(cartData));
    }
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const auth = JSON.parse(localStorage.getItem('customerAuth') || '{}');
    if (!auth.token) return;

    setLoadingHistory(true);
    try {
      const res = await fetch(`http://192.168.1.3:5000/api/orders/customer/${auth.id}`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 2. Payment Logic
  const handleOnlinePayment = async () => {
    if (!accountNumber || !bankName) {
      alert('Please fill in all payment details');
      return;
    }
    processPayment('online', 'PAID', 'Paid Online');
  };

  const handleCardCashPayment = async (method) => {
    // method is 'CARD' or 'CASH'
    processPayment('cod', 'Awaiting Steward Payment', `Pay by ${method}`, method);
  };

  const processPayment = async (methodKey, orderStatusLabel, successMessage, notificationType = null) => {
    setProcessing(true);
    try {
      const auth = JSON.parse(localStorage.getItem('customerAuth') || '{}');
      if (!auth.token) {
        alert('Please login again');
        navigate('/customer/login');
        return;
      }

      // Create Order
      const orderResponse = await fetch('http://192.168.1.3:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          customerId: auth.id,
          stewardId: selectedSteward?.id,
          orderType: 'DINE_IN',
          paymentMethod: methodKey, // 'online' or 'cod'
          total: total,
          items: cart
        })
      });

      if (!orderResponse.ok) {
        const err = await orderResponse.json();
        throw new Error(err.message || 'Order creation failed');
      }

      const orderData = await orderResponse.json();

      // If Card/Cash, send notification
      if (notificationType) {
        try {
          await fetch('http://192.168.1.3:5000/api/staff/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stewardId: selectedSteward?.id,
              message: `Payment request from ${auth.name} - Order #${orderData.orderId} - Method: ${notificationType} - Amount: Rs. ${total.toLocaleString()}`,
              type: 'PAYMENT_REQUEST'
            })
          });
        } catch (notifyErr) {
          console.error("Notification failed", notifyErr);
          // Don't block flow
        }
      }

      // Update Local State
      localStorage.removeItem('cart');
      setCart([]);
      alert(`✅ ${successMessage}\nOrder #${orderData.orderId} placed.`);

      // Refresh History & View
      setSelectedMethod(null);
      setAccountNumber('');
      setBankName('');
      setView('history');
      fetchHistory();

    } catch (error) {
      console.error('Payment Error:', error);
      alert('Payment failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Rating Logic (Preserved)
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState('');

  const handleOpenRating = (order) => {
    setSelectedOrderForRating(order);
    setRatingModalOpen(true);
  };

  const handleSubmitRating = async () => {
    const auth = JSON.parse(localStorage.getItem('customerAuth'));
    try {
      const res = await fetch('http://192.168.1.3:5000/api/customer/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          stewardId: selectedOrderForRating.steward_id,
          rating: ratingValue,
          comment: comment
        })
      });
      if (res.ok) {
        alert('Thank you for your feedback!');
        setRatingModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient px-4 py-8 mb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header Tabs */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-[#D4AF37]">Payments & Orders</h1>
            <p className="text-gray-400">Manage your transactions</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('checkout')}
              className={`px-4 py-2 rounded-lg transition-all ${view === 'checkout' ? 'bg-gold-500 text-black shadow-lg' : 'bg-white/10 text-gray-400 hover:text-white'}`}
            >
              Checkout ({cart.length})
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-2 rounded-lg transition-all ${view === 'history' ? 'bg-gold-500 text-black shadow-lg' : 'bg-white/10 text-gray-400 hover:text-white'}`}
            >
              History
            </button>
          </div>
        </div>

        {/* CHECKOUT VIEW */}
        {view === 'checkout' && (
          <>
            {cart.length === 0 ? (
              <GlassCard className="text-center p-12">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
                <Button onClick={() => navigate('/customer/menu-category')}>Browse Menu</Button>
              </GlassCard>
            ) : (
              <div className="animate-fade-in">
                {/* Summary Header */}
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-black text-white mb-2">Total Amount</h2>
                  <div className="text-5xl font-black text-gold-500">Rs. {total.toLocaleString()}</div>
                </div>

                {!selectedMethod ? (
                  /* METHOD SELECTION (Two Options) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Online Payment */}
                    <GlassCard
                      className="p-8 cursor-pointer hover:border-gold-500/50 transition-all group hover:scale-[1.02]"
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
                      className="p-8 cursor-pointer hover:border-gold-500/50 transition-all group hover:scale-[1.02]"
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
                        <p className="text-gray-400 text-sm">Pay via Steward at your table</p>
                      </div>
                    </GlassCard>
                  </div>
                ) : (
                  /* SELECTED METHOD FORM */
                  <div className="max-w-2xl mx-auto">
                    {selectedMethod === 'online' && (
                      <GlassCard className="p-8">
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
                            <Button variant="outline" onClick={() => setSelectedMethod(null)} disabled={processing} className="flex-1">Back</Button>
                            <Button onClick={handleOnlinePayment} disabled={processing} className="flex-1 font-black">
                              {processing ? 'Processing...' : 'Confirm Payment'}
                            </Button>
                          </div>
                        </div>
                      </GlassCard>
                    )}

                    {selectedMethod === 'cardcash' && (
                      <GlassCard className="p-8">
                        <h2 className="text-2xl font-black text-white mb-6 text-center">Choose Payment Type</h2>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <Button onClick={() => handleCardCashPayment('CARD')} disabled={processing} className="py-4 font-black">Pay by Card</Button>
                          <Button onClick={() => handleCardCashPayment('CASH')} disabled={processing} variant="outline" className="py-4 font-black">Pay by Cash</Button>
                        </div>
                        <Button variant="outline" onClick={() => setSelectedMethod(null)} disabled={processing} className="w-full">Back</Button>
                        <p className="text-gray-400 text-sm text-center mt-6">
                          Your steward <span className="text-gold-500 font-bold">{selectedSteward?.name}</span> will be notified to collect payment.
                        </p>
                      </GlassCard>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="text-center py-10 text-gold-500">Loading history...</div>
            ) : paymentHistory.length === 0 ? (
              <GlassCard className="text-center py-12">
                <p className="text-gray-400">No payment history found.</p>
              </GlassCard>
            ) : (
              paymentHistory.map(order => (
                <GlassCard key={order.id} className="flex justify-between items-center transition-transform hover:scale-[1.01]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">Order #{order.id}</span>
                      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 uppercase">{order.order_type}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{new Date(order.created_at || order.order_time).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold-500 font-bold mb-2">Rs. {order.total_price || order.total_amount}</p>
                    <div className="flex gap-2 justify-end items-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${order.payment_status === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {order.payment_status}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500`}>
                        {order.order_status}
                      </span>
                      {order.order_status === 'COMPLETED' && (
                        <button onClick={() => handleOpenRating(order)} className="ml-2 text-xs text-gold-500 hover:text-gold-400 underline">Rate</button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* Rating Modal */}
        {ratingModalOpen && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <GlassCard className="max-w-md w-full p-8 border-gold-500/30">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gold-500 mb-2">Rate Your Experience</h2>
                <div className="flex justify-center gap-4 mb-8 mt-4">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} onClick={() => setRatingValue(v)} className={`text-3xl transition-all ${ratingValue >= v ? 'grayscale-0 scale-125' : 'grayscale opacity-30'}`}>⭐</button>
                  ))}
                </div>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white focus:border-gold-500 focus:outline-none mb-6 h-24 placeholder:text-gray-600"
                  placeholder="Share your thoughts..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setRatingModalOpen(false)}>Cancel</Button>
                  <Button variant="primary" className="flex-1" onClick={handleSubmitRating}>Submit</Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;
