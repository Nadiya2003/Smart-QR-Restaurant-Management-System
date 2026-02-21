import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Notification from '../components/Notification';

/**
 * ManagerDashboard - Comprehensive dashboard for restaurant managers
 * Features: Staff overview, sales analytics, inventory status, order management
 */
const ManagerDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        activeStaff: 0,
        pendingOrders: 0,
    });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('staffToken');
        const userData = JSON.parse(localStorage.getItem('staffUser') || '{}');

        if (!token || userData.role !== 'manager') {
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

            // Fetch notifications
            const notifResponse = await fetch('http://localhost:5000/api/staff/notifications', { headers });
            const notifData = await notifResponse.json();
            setNotifications(notifData.notifications || []);

            // Fetch dashboard stats
            const statsResponse = await fetch('http://localhost:5000/api/staff/dashboard/stats', { headers });
            const statsData = await statsResponse.json();
            setStats(statsData.stats || stats);

            // Fetch recent orders
            const ordersResponse = await fetch('http://localhost:5000/api/staff/orders', { headers });
            const ordersData = await ordersResponse.json();
            setOrders(ordersData.orders || []);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
        }
    };

    const handleMarkRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('staffToken');
            await fetch(`http://localhost:5000/api/staff/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
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
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFA500]/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] flex items-center justify-center text-2xl">
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                '👔'
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Welcome, {user?.full_name}</h1>
                            <p className="text-white/60">Manager Dashboard</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">📊</div>
                            <div>
                                <p className="text-white/60 text-sm">Total Orders</p>
                                <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">💰</div>
                            <div>
                                <p className="text-white/60 text-sm">Total Revenue</p>
                                <p className="text-2xl font-bold text-[#FFD700]">${stats.totalRevenue}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">👥</div>
                            <div>
                                <p className="text-white/60 text-sm">Active Staff</p>
                                <p className="text-2xl font-bold text-white">{stats.activeStaff}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl">⏳</div>
                            <div>
                                <p className="text-white/60 text-sm">Pending Orders</p>
                                <p className="text-2xl font-bold text-orange-400">{stats.pendingOrders}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Orders */}
                    <div className="lg:col-span-2">
                        <GlassCard>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span>🛎️</span> Recent Orders
                            </h2>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {orders.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No orders yet</p>
                                ) : (
                                    orders.map((order) => (
                                        <div key={order.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-semibold text-white">Order #{order.id}</p>
                                                    <p className="text-white/60 text-sm">{order.type}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        order.status === 'preparing' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <p className="text-white/70 text-sm">{order.items}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-white/60 text-xs">{new Date(order.created_at).toLocaleString()}</p>
                                                <p className="text-[#FFD700] font-semibold">${order.total}</p>
                                            </div>
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

                {/* Quick Actions */}
                <div className="mt-6">
                    <GlassCard>
                        <h2 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Button variant="secondary" onClick={() => alert('View Reports')}>
                                📈 View Reports
                            </Button>
                            <Button variant="secondary" onClick={() => alert('Manage Staff')}>
                                👥 Manage Staff
                            </Button>
                            <Button variant="secondary" onClick={() => alert('Inventory')}>
                                📦 Inventory
                            </Button>
                            <Button variant="secondary" onClick={() => alert('Settings')}>
                                ⚙️ Settings
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;
