import { useState, useEffect } from "react";
import GlassCard from "../components/GlassCard";
import OrderStatus from "../components/OrderStatus";
import PaymentModal from "../components/PaymentModal";
import Button from "../components/Button";

function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('customerAuth') || '{}');
    if (auth.permissions) {
      setPermissions(auth.permissions);
    }

    // Check for pending order creation - legacy logic removed to enforce Payment Module flow
    // const isCompletingOrder = localStorage.getItem('isCompletingOrder');
    // const cart = JSON.parse(localStorage.getItem('customerCart') || '[]');

    // if (isCompletingOrder && cart.length > 0 && auth.id) {
    //   processOrder(auth, cart);
    // } else if (auth.id) {

    if (auth.id) {
      fetchOrders(auth);
    }
  }, []);

  const processOrder = async (auth, cart) => {
    try {
      const steward = JSON.parse(localStorage.getItem('selectedSteward') || '{}');
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          customerId: auth.id,
          stewardId: steward.id,
          items: cart,
          total: total,
          paymentMethod: 'cod' // Default to Pay at Counter/Later
        })
      });

      if (response.ok) {
        // Clear cart and flag
        localStorage.removeItem('customerCart');
        localStorage.removeItem('isCompletingOrder');
        // Refresh orders
        fetchOrders(auth);
        // Optional: Show success
        alert('Order placed successfully!');
      } else {
        console.error('Failed to place order');
        alert('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Network error while placing order.');
    }
  };

  const fetchOrders = async (auth) => {
    // Permission Check
    if (auth.permissions && !auth.permissions.includes('orders.view')) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/orders/customer/${auth.id}`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = (order) => {
    if (!permissions.includes('payments.make')) {
      alert('You do not have permission to make payments.');
      return;
    }
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = () => {
    const auth = JSON.parse(localStorage.getItem('customerAuth') || '{}');
    fetchOrders(auth);
    setShowPaymentModal(false);
    setSelectedOrder(null);
  }

  const openOrders = orders.filter(o => o.payment_status === 'PENDING');
  const paidOrders = orders.filter(o => o.payment_status !== 'PENDING');

  // Helper to check permission
  const can = (perm) => permissions.includes(perm);

  return (
    <div className="min-h-screen bg-dark-gradient mb-20 md:mb-0 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-[#D4AF37] drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">Dashboard</h1>
          <p className="text-gray-400">Your orders and activity</p>
        </div>

        {!can('orders.view') ? (
          <GlassCard className="text-center p-8">
            <h2 className="text-xl text-red-400">Access Restricted</h2>
            <p className="text-gray-400">You do not have permission to view orders.</p>
          </GlassCard>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {[
                { label: "Open Orders", value: openOrders.length.toString(), icon: "🛎️" },
                { label: "Paid Orders", value: paidOrders.length.toString(), icon: "✅" },
                { label: "Total Orders", value: orders.length.toString(), icon: "📊" },
                { label: "Total Spent", value: `Rs. ${orders.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0)}`, icon: "💰" },
              ].map((stat, idx) => (
                <GlassCard key={idx} className="hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all">
                  <div className="text-center">
                    <div className="text-4xl mb-2">{stat.icon}</div>
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-2xl font-bold text-gold-500">{stat.value}</p>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Active Tracking Section */}
            {openOrders.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Live Order Tracking</h2>
                </div>

                <div className="grid gap-6">
                  {openOrders.map((order) => (
                    <GlassCard key={order.id} className="border-gold-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
                      <div className="relative p-2">
                        {/* Header info */}
                        <div className="flex justify-between items-center mb-8 px-4 pt-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-[.3em] text-gold-500/60 block mb-1">Current Session</span>
                            <h3 className="text-xl font-bold">Order #00{order.id}</h3>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-black text-white">LKR {order.total_price}</span>
                          </div>
                        </div>

                        {/* The Visual Tracker */}
                        <div className="bg-black/20 rounded-3xl p-8 mb-4 border border-white/5">
                          <OrderStatus status={order.status || 'PENDING'} />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between px-4 pb-4">
                          <p className="text-sm text-white/40 italic">Last updated: {new Date(order.created_at).toLocaleTimeString()}</p>
                          {can('payments.make') && (
                            <Button
                              variant="primary"
                              onClick={() => handlePaymentClick(order)}
                              className="px-8"
                            >
                              Settle Bill
                            </Button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Recent Orders</h2>
              {loading ? (
                <p className="text-gray-400">Loading orders...</p>
              ) : orders.length === 0 ? (
                <GlassCard>
                  <p className="text-gray-400 text-center py-8">No orders yet. Start ordering from the menu!</p>
                </GlassCard>
              ) : (
                paidOrders.map((order) => (
                  <GlassCard key={order.id} className="hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-400">Order #{order.id}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gold-500">Rs. {order.total_price}</p>
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                            {order.payment_method}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-sm text-gray-300 mb-2">Status: {order.status}</p>
                        <OrderStatus status={order.status} />
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}

export default CustomerDashboard;
