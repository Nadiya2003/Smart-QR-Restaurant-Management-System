import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Notification from '../components/Notification';

/**
 * StewardDashboard - Dashboard for stewards (waiters)
 * Features: Table management, order taking, customer service
 */
const StewardDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [tables, setTables] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('staffToken');
        const userData = JSON.parse(localStorage.getItem('staffUser') || '{}');

        if (!token || userData.role !== 'steward') {
            navigate('/staff/login');
            return;
        }

        setUser(userData);
        fetchDashboardData(token);
    }, [navigate]);

    const fetchDashboardData = async (token) => {
        try {
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

            const [notifRes, ordersRes] = await Promise.all([
                fetch('http://localhost:5000/api/staff/notifications', { headers }),
                fetch('http://localhost:5000/api/staff/orders', { headers }),
            ]);

            const notifData = await notifRes.json();
            const ordersData = await ordersRes.json();

            setNotifications(notifData.notifications || []);
            setOrders(ordersData.orders || []);
            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('staffToken');
            await fetch(`http://localhost:5000/api/staff/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            fetchDashboardData(token);
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const handleMarkRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('staffToken');
            await fetch(`http://localhost:5000/api/staff/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setNotifications(notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffUser');
        navigate('/staff/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#121212] flex items-center justify-center">
                <div className="text-[#FFD700] text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121212] p-6">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFA500]/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-2xl">
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : '🪑'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Welcome, {user?.full_name}</h1>
                            <p className="text-white/60">Steward Dashboard</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>Logout</Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span>🛎️</span> Active Orders
                            </h2>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {orders.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No active orders</p>
                                ) : (
                                    orders.map((order) => (
                                        <div key={order.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-[#D4AF37]/30 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-white">Order #{order.id}</p>
                                                    <p className="text-white/60 text-sm">{order.type} • Table {order.table_number || 'N/A'}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        order.status === 'preparing' ? 'bg-blue-500/20 text-blue-400' :
                                                            order.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                    {order.payment_status && (
                                                        <span className={`text-xs px-2 py-0.5 rounded border ${order.payment_status === 'PAID'
                                                                ? 'text-green-400 border-green-500/30 bg-green-500/10'
                                                                : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                                                            }`}>
                                                            {order.payment_status === 'PAID' ? 'PAID ✅' : 'Payment Pending ⏳'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Payment Method Display */}
                                            {order.payment_method && (
                                                <div className="mb-2 text-xs flex items-center gap-2 text-gold-300 bg-gold-500/5 p-2 rounded">
                                                    <span>💳 Payment Method:</span>
                                                    <span className="font-bold">{order.payment_method}</span>
                                                </div>
                                            )}

                                            <div className="text-white/70 text-sm mb-3">
                                                {order.items.map(item => (
                                                    <div key={item.id} className="flex justify-between">
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span>Rs. {item.price * item.quantity}</span>
                                                    </div>
                                                ))}
                                                <div className="border-t border-white/10 mt-2 pt-1 flex justify-between font-bold text-white">
                                                    <span>Total:</span>
                                                    <span>Rs. {order.total}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {order.status === 'ready' && (
                                                    <Button
                                                        variant="primary"
                                                        onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                                        fullWidth
                                                        disabled={order.payment_status !== 'PAID' && order.payment_status !== 'CASH_PENDING'}
                                                    >
                                                        Mark as Delivered
                                                    </Button>
                                                )}
                                                {order.payment_status === 'CASH_PENDING' && (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => {/* Handle cash payment confirmation logic if needed */ }}
                                                        fullWidth
                                                        className="border-green-500 text-green-400 hover:bg-green-500/20"
                                                    >
                                                        Confirm Cash Received
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    <div>
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span>🔔</span> Notifications
                                {notifications.filter(n => !n.is_read).length > 0 && (
                                    <span className="bg-[#FFD700] text-black text-xs px-2 py-1 rounded-full">
                                        {notifications.filter(n => !n.is_read).length}
                                    </span>
                                )}
                            </h2>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No notifications</p>
                                ) : (
                                    notifications.map((notification) => (
                                        <Notification
                                            key={notification.id}
                                            notification={notification}
                                            onMarkRead={handleMarkRead}
                                        />
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StewardDashboard;
