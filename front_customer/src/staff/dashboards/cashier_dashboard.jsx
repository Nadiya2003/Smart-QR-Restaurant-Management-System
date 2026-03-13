import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Notification from '../components/Notification';

/**
 * CashierDashboard - Dashboard for cashiers
 * Features: Payment processing, order billing, transaction history
 */
const CashierDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [payments, setPayments] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [stats, setStats] = useState({
        todayPayments: 0,
        todayRevenue: 0,
        pendingPayments: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('staffToken');
        const userData = JSON.parse(localStorage.getItem('staffUser') || '{}');

        if (!token || userData.role !== 'cashier') {
            navigate('/staff/login');
            return;
        }

        setUser(userData);
        fetchDashboardData(token);
    }, [navigate]);

    const fetchDashboardData = async (token) => {
        try {
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const [notifRes, paymentsRes, ordersRes] = await Promise.all([
                fetch('http://192.168.1.3:5000/api/staff/notifications', { headers }),
                fetch('http://192.168.1.3:5000/api/staff/payments', { headers }),
                fetch('http://192.168.1.3:5000/api/staff/orders?status=completed', { headers }),
            ]);

            const notifData = await notifRes.json();
            const paymentsData = await paymentsRes.json();
            const ordersData = await ordersRes.json();

            setNotifications(notifData.notifications || []);
            setPayments(paymentsData.payments || []);
            setPendingOrders(ordersData.orders || []);

            // Calculate stats
            const todayPayments = paymentsData.payments?.filter(p =>
                new Date(p.created_at).toDateString() === new Date().toDateString()
            ) || [];

            setStats({
                todayPayments: todayPayments.length,
                todayRevenue: todayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
                pendingPayments: paymentsData.payments?.filter(p => p.status === 'pending').length || 0,
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const handleProcessPayment = async (orderId) => {
        try {
            const token = localStorage.getItem('staffToken');
            await fetch(`http://192.168.1.3:5000/api/staff/payments/process`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderId }),
            });

            fetchDashboardData(token);
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    };

    const handleMarkRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('staffToken');
            await fetch(`http://192.168.1.3:5000/api/staff/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            setNotifications(notifications.map(n =>
                n.id === notificationId ? { ...n, is_read: true } : n
            ));
        } catch (error) {
            console.error('Error marking notification as read:', error);
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
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-2xl">
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                '💰'
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Welcome, {user?.full_name}</h1>
                            <p className="text-white/60">Cashier Dashboard</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>Logout</Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">📊</div>
                            <div>
                                <p className="text-white/60 text-sm">Today's Payments</p>
                                <p className="text-2xl font-bold text-white">{stats.todayPayments}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">💵</div>
                            <div>
                                <p className="text-white/60 text-sm">Today's Revenue</p>
                                <p className="text-2xl font-bold text-[#FFD700]">${stats.todayRevenue.toFixed(2)}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">⏳</div>
                            <div>
                                <p className="text-white/60 text-sm">Pending Payments</p>
                                <p className="text-2xl font-bold text-orange-400">{stats.pendingPayments}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pending Orders for Payment */}
                    <div className="lg:col-span-2">
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span>🧾</span> Orders Ready for Payment
                            </h2>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {pendingOrders.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No pending orders</p>
                                ) : (
                                    pendingOrders.map((order) => (
                                        <div key={order.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-white">Order #{order.id}</p>
                                                    <p className="text-white/60 text-sm">{order.type} • Table {order.table_number || 'N/A'}</p>
                                                </div>
                                                <p className="text-[#FFD700] font-bold text-xl">${order.total}</p>
                                            </div>
                                            <p className="text-white/70 text-sm mb-3">{order.items}</p>
                                            <Button
                                                variant="primary"
                                                onClick={() => handleProcessPayment(order.id)}
                                                fullWidth
                                            >
                                                Process Payment
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Notifications */}
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

                {/* Payment History */}
                <div className="mt-6">
                    <GlassCard>
                        <h2 className="text-xl font-bold text-white mb-4">💳 Recent Payments</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-white/60 pb-3">Order ID</th>
                                        <th className="text-left text-white/60 pb-3">Amount</th>
                                        <th className="text-left text-white/60 pb-3">Status</th>
                                        <th className="text-left text-white/60 pb-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.slice(0, 5).map((payment) => (
                                        <tr key={payment.id} className="border-b border-white/5">
                                            <td className="py-3 text-white">#{payment.order_id}</td>
                                            <td className="py-3 text-[#FFD700] font-semibold">${payment.amount}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${payment.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-white/60 text-sm">{new Date(payment.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default CashierDashboard;
