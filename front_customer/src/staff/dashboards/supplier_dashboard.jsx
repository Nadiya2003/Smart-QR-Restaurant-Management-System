import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Notification from '../components/Notification';

const SupplierDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ pendingOrders: 0, receivedOrders: 0, totalPayments: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('staffToken');
        const userData = JSON.parse(localStorage.getItem('staffUser') || '{}');

        if (!token || userData.role !== 'supplier') {
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
                fetch('http://localhost:5000/api/staff/supplier/orders', { headers }),
            ]);

            const notifData = await notifRes.json();
            const ordersData = await ordersRes.json();

            setNotifications(notifData.notifications || []);
            setOrders(ordersData.orders || []);

            setStats({
                pendingOrders: ordersData.orders?.filter(o => o.status === 'pending').length || 0,
                receivedOrders: ordersData.orders?.filter(o => o.status === 'received').length || 0,
                totalPayments: ordersData.orders?.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0) || 0,
            });

            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('staffToken');
            await fetch(`http://localhost:5000/api/staff/supplier/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchDashboardData(token);
        } catch (error) {
            console.error('Error:', error);
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
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-2xl">
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : '🚚'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Welcome, {user?.full_name}</h1>
                            <p className="text-white/60">Supplier Dashboard</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>Logout</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">⏳</div>
                            <div>
                                <p className="text-white/60 text-sm">Pending Orders</p>
                                <p className="text-2xl font-bold text-yellow-400">{stats.pendingOrders}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">✅</div>
                            <div>
                                <p className="text-white/60 text-sm">Received Orders</p>
                                <p className="text-2xl font-bold text-green-400">{stats.receivedOrders}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">💰</div>
                            <div>
                                <p className="text-white/60 text-sm">Total Payments</p>
                                <p className="text-2xl font-bold text-[#FFD700]">${stats.totalPayments.toFixed(2)}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span>📋</span> Supply Orders
                            </h2>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {orders.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No orders</p>
                                ) : (
                                    orders.map((order) => (
                                        <div key={order.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-white">Order #{order.id}</p>
                                                    <p className="text-white/60 text-sm">{order.items}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        order.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                                            order.status === 'shipped' ? 'bg-purple-500/20 text-purple-400' :
                                                                'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-[#FFD700] font-semibold">${order.amount}</p>
                                                <div className="flex gap-2">
                                                    {order.status === 'pending' && (
                                                        <Button variant="primary" onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}>
                                                            Confirm
                                                        </Button>
                                                    )}
                                                    {order.status === 'confirmed' && (
                                                        <Button variant="primary" onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}>
                                                            Ship
                                                        </Button>
                                                    )}
                                                </div>
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
                                        <Notification key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
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

export default SupplierDashboard;
