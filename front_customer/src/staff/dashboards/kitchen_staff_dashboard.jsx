import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Notification from '../components/Notification';

const KitchenStaffDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({ pendingOrders: 0, preparingOrders: 0, completedToday: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('staffToken');
        const userData = JSON.parse(localStorage.getItem('staffUser') || '{}');

        if (!token || userData.role !== 'kitchen_staff') {
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
                fetch('http://192.168.1.3:5000/api/staff/notifications', { headers }),
                fetch('http://192.168.1.3:5000/api/staff/orders?category=food', { headers }),
            ]);

            const notifData = await notifRes.json();
            const ordersData = await ordersRes.json();

            setNotifications(notifData.notifications || []);
            setOrders(ordersData.orders || []);

            const todayOrders = ordersData.orders?.filter(o =>
                new Date(o.created_at).toDateString() === new Date().toDateString() && o.status === 'completed'
            ) || [];

            setStats({
                pendingOrders: ordersData.orders?.filter(o => o.status === 'pending').length || 0,
                preparingOrders: ordersData.orders?.filter(o => o.status === 'preparing').length || 0,
                completedToday: todayOrders.length,
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
            await fetch(`http://192.168.1.3:5000/api/staff/orders/${orderId}/status`, {
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
            await fetch(`http://192.168.1.3:5000/api/staff/notifications/${notificationId}/read`, {
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
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-2xl">
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : '👨‍🍳'}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Welcome, {user?.full_name}</h1>
                            <p className="text-white/60">Kitchen Staff Dashboard</p>
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
                            <div className="text-4xl">🔥</div>
                            <div>
                                <p className="text-white/60 text-sm">Preparing</p>
                                <p className="text-2xl font-bold text-orange-400">{stats.preparingOrders}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">✅</div>
                            <div>
                                <p className="text-white/60 text-sm">Completed Today</p>
                                <p className="text-2xl font-bold text-green-400">{stats.completedToday}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span>🍳</span> Food Orders
                            </h2>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {orders.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No pending orders</p>
                                ) : (
                                    orders.map((order) => (
                                        <div key={order.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-white">Order #{order.id}</p>
                                                    <p className="text-white/60 text-sm">{order.type} • Table {order.table_number || 'N/A'}</p>
                                                    <p className="text-white/40 text-xs mt-1">{new Date(order.created_at).toLocaleTimeString()}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        order.status === 'preparing' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 mb-3">
                                                <p className="text-white font-medium mb-1">Items:</p>
                                                <p className="text-white/70 text-sm">{order.items}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {order.status === 'pending' && (
                                                    <Button variant="primary" onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} fullWidth>
                                                        Start Preparing
                                                    </Button>
                                                )}
                                                {order.status === 'preparing' && (
                                                    <Button variant="primary" onClick={() => handleUpdateOrderStatus(order.id, 'ready')} fullWidth>
                                                        Mark as Ready
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

export default KitchenStaffDashboard;
