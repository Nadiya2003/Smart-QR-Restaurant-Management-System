import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import { io } from 'socket.io-client';

import AccountAvatar from '../assets/default-customer-avatar.png';

/**
 * Account Page - Premium User Dashboard
 * Features:
 * - Profile Management (Edit name/phone)
 * - Order History (Detailed view)
 * - Reservations Management
 * - Loyalty Program Status
 */
function Account() {
    const { logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [accountData, setAccountData] = useState({
        profile: null,
        orders: [],
        reservations: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', phone: '' });
    const [updateLoading, setUpdateLoading] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchAccountData();

        // Socket integration for real-time updates
        const socket = io(config.API_BASE_URL);
        
        socket.on('reservationUpdate', (data) => {
            setAccountData(prev => ({
                ...prev,
                reservations: (prev.reservations || []).map(res => 
                    Number(res.id) === Number(data.id) ? { ...res, status: data.status } : res
                )
            }));
        });

        socket.on('delivery_order_updated', (data) => {
            setAccountData(prev => ({
                ...prev,
                orders: (prev.orders || []).map(order => 
                    Number(order.id) === Number(data.orderId) ? { ...order, order_status: data.status, delivery_status: data.status } : order
                )
            }));
        });

        socket.on('orderUpdate', (data) => {
            setAccountData(prev => ({
                ...prev,
                orders: (prev.orders || []).map(order => 
                    Number(order.id) === Number(data.id) ? { ...order, order_status: data.status } : order
                )
            }));
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchAccountData = async () => {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) {
                navigate('/auth');
                return;
            }
            const res = await fetch(`${config.API_BASE_URL}/api/customer/account`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAccountData(data);
                setEditForm({ name: data.profile?.name || '', phone: data.profile?.phone || '' });
            } else {
                setError(data.message || 'Failed to load account data');
                if (res.status === 401) logout();
            }
        } catch (err) {
            console.error('Failed to fetch account data', err);
            setError('Connection error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}/api/customer/profile`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (res.ok) {
                setIsEditing(false);
                fetchAccountData(); // Refresh
                alert('Profile updated successfully!');
            } else {
                alert(data.message || 'Update failed');
            }
        } catch (err) {
            alert('Failed to connect to server');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleCancelAction = async (type, id) => {
        const confirmBox = window.confirm(`Are you sure you want to cancel this ${type}? This action cannot be undone.`);
        if (!confirmBox) return;

        try {
            const token = sessionStorage.getItem('token');
            let endpoint = '';
            if (type === 'reservation') endpoint = `${config.API_BASE_URL}/api/reservations/cancel/${id}`;
            else endpoint = `${config.API_BASE_URL}/api/orders/${type.toLowerCase()}/cancel/${id}`;

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Customer requested cancellation from dashboard' })
            });

            if (res.ok) {
                fetchAccountData(); // Refresh UI
            } else {
                const data = await res.json();
                alert(data.message || 'Cancellation failed');
            }
        } catch (err) {
            alert('Failed to connect to server');
        }
    };

    if (!isAuthenticated) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
            <GlassCard className="max-w-md w-full text-center p-12 border-[#D4AF37]/20 shadow-2xl">
                <div className="text-4xl font-black text-[#D4AF37] mb-6 tracking-tighter">PORTAL</div>
                <h2 className="text-3xl font-bold text-white mb-2 font-serif">Member Access</h2>
                <p className="text-gray-400 mb-10">Sign in to manage your reservations and view exclusive benefits.</p>
                <Button onClick={() => navigate('/auth')} className="w-full bg-[#D4AF37] hover:bg-[#E6C86E] text-black font-bold h-14 text-lg shadow-xl shadow-[#D4AF37]/20">
                    Sign In
                </Button>
            </GlassCard>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
            <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#D4AF37] font-medium tracking-widest uppercase text-xs">Curating Your Experience...</p>
        </div>
    );

    const { profile, orders, reservations } = accountData;

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#D4AF37]/3 rounded-full blur-[120px] -ml-64 -mb-64"></div>

            <div className="container mx-auto max-w-6xl relative z-10">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-8">
                    <div>
                        <p className="text-[#D4AF37] uppercase tracking-[0.3em] font-bold text-xs mb-3">Customer Dashboard</p>
                        <h1 className="text-5xl lg:text-7xl font-serif text-white mb-4">
                            {profile?.name}
                        </h1>
                        <p className="text-gray-500 font-medium">Your personalized portal for reservations and orders.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline" 
                            onClick={logout}
                            className="border-red-500/30 text-red-500 hover:bg-red-500/5 px-8"
                        >
                            Log Out
                        </Button>
                        <Button 
                            onClick={() => navigate('/menu')}
                            className="bg-[#D4AF37] text-black font-bold px-8 shadow-lg shadow-[#D4AF37]/20"
                        >
                            Order Now
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar navigation */}
                    <div className="lg:col-span-3 space-y-4">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 ${activeTab === 'overview' ? 'bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="text-[10px] font-black opacity-50">01</span> Overview
                        </button>
                        <button 
                            onClick={() => setActiveTab('orders')}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 ${activeTab === 'orders' ? 'bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="text-[10px] font-black opacity-50">02</span> Orders
                        </button>
                        <button 
                            onClick={() => setActiveTab('reservations')}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 ${activeTab === 'reservations' ? 'bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="text-[10px] font-black opacity-50">03</span> Reservations
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 ${activeTab === 'settings' ? 'bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="text-[10px] font-black opacity-50">04</span> Settings
                        </button>



                        {/* Quick Stats sidebar card */}
                        <GlassCard className="p-6 mt-8 border-white/5 bg-white/[0.02]">
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-black mb-4">Loyalty Status</p>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="text-xs font-black bg-[#D4AF37] text-black px-2 py-1 rounded">PLATINUM</div>
                                <div>
                                    <p className="text-2xl font-black text-white">{profile?.loyalty_points || 0}</p>
                                    <p className="text-[10px] text-[#D4AF37] font-bold uppercase">Points</p>
                                </div>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] h-full"
                                    style={{ width: `${Math.min(100, (profile?.loyalty_points % 1000) / 10)}%` }}
                                ></div>
                            </div>
                            <p className="text-[9px] text-gray-500 mt-2">Next tier at 1,000 points</p>
                        </GlassCard>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        {/* Tab Content: OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <GlassCard className="p-8 border-[#D4AF37]/10 bg-gradient-to-br from-white/5 to-transparent">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-2">Member Profile</h3>
                                                <p className="text-gray-400 text-sm">Update your details in settings</p>
                                            </div>
                                            <div className="w-16 h-16 rounded-full border-2 border-[#D4AF37] overflow-hidden">
                                                <img 
                                                    src={profile?.profile_image ? (profile.profile_image.startsWith('http') ? profile.profile_image : `${config.API_BASE_URL}${profile.profile_image}`) : AccountAvatar} 
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-gray-500 text-sm">Full Name</span>
                                                <span className="text-white font-medium">{profile?.name}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-gray-500 text-sm">Registered Email</span>
                                                <span className="text-white font-medium">{profile?.email}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-gray-500 text-sm">Contact Number</span>
                                                <span className="text-white font-medium">{profile?.phone || 'Not provided'}</span>
                                            </div>
                                        </div>
                                    </GlassCard>

                                    <GlassCard className="p-8 border-white/5 text-center flex flex-col items-center justify-center">
                                        <div className="text-xs font-black text-[#D4AF37] border-2 border-[#D4AF37] px-4 py-1 rounded mb-4 tracking-tighter">FAST-TRACK</div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Instant Dining</h3>
                                        <p className="text-gray-400 text-sm mb-6 max-w-[200px]">Scan our tables or menu for immediate service.</p>
                                        <Button onClick={() => navigate('/menu')} variant="outline" className="w-full border-white/20">View Menu</Button>
                                    </GlassCard>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <GlassCard className="p-6 border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Total Lifetime Orders</p>
                                        <p className="text-3xl font-serif text-[#D4AF37]">{orders?.length || 0}</p>
                                    </GlassCard>
                                    <GlassCard className="p-6 border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Active Reservations</p>
                                        <p className="text-3xl font-serif text-white">{reservations?.filter(r => r.status !== 'CANCELLED').length || 0}</p>
                                    </GlassCard>
                                    <GlassCard className="p-6 border-white/5">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Member Since</p>
                                        <p className="text-3xl font-serif text-white">{new Date(profile?.created_at).getFullYear()}</p>
                                    </GlassCard>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: ORDERS */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-2xl font-serif text-white mb-6">Your Orders</h3>
                                {orders?.length === 0 ? (
                                    <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                        <p className="text-gray-500">No recent culinary discoveries found.</p>
                                        <Button onClick={() => navigate('/menu')} className="mt-4 bg-[#D4AF37] text-black">Start Ordering</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.map(order => {
                                            const isTerminal = ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(order.order_status?.toUpperCase());
                                            const statusSteps = ['Pending', 'Accepted', 'Picked Up', 'On the Way', 'Delivered'];
                                            const currentStatus = order.order_status || 'Pending';
                                            
                                            // Handle formatting differences
                                            let normalizedStatus = currentStatus;
                                            const upStatus = currentStatus.toUpperCase();
                                            if (upStatus === 'READY' || upStatus === 'PREPARING' || upStatus === 'COOKING') {
                                                normalizedStatus = 'Accepted';
                                            }
                                            
                                            const currentIdx = statusSteps.findIndex(s => s.toLowerCase() === normalizedStatus.toLowerCase());

                                            return (
                                                <GlassCard key={order.id} className={`p-6 transition-all border-white/5 ${!isTerminal ? 'border-[#10B981]/30 bg-green-500/[0.02]' : 'hover:border-[#D4AF37]/30'}`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black text-[#D4AF37] border border-white/10">
                                                                {order.type === 'DELIVERY' ? 'DLR' : order.type === 'DINE-IN' ? 'DIN' : 'TKW'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white flex items-center gap-2">
                                                                    Order #{order.id} 
                                                                    {!isTerminal && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
                                                                    <span className="text-[8px] bg-white/10 text-[#D4AF37] px-2 py-0.5 rounded uppercase">{order.type}</span>
                                                                </p>
                                                                <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-[#D4AF37]">Rs. {Number(order.total_price).toLocaleString()}</p>
                                                            <span className={`text-[9px] uppercase font-bold px-3 py-1 rounded-full ${
                                                                order.order_status === 'COMPLETED' || order.order_status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' : 
                                                                order.order_status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                                            }`}>
                                                                {order.order_status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Tracking Stepper (Only for active orders) */}
                                                    {!isTerminal && (
                                                        <div className="mt-8 pt-6 border-t border-white/5">
                                                            <div className="relative flex justify-between">
                                                                <div className="absolute top-4 left-0 w-full h-0.5 bg-white/5 -z-0">
                                                                    <div 
                                                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000"
                                                                        style={{ width: `${(Math.max(0, currentIdx) / (statusSteps.length - 1)) * 100}%` }}
                                                                    ></div>
                                                                </div>

                                                                {statusSteps.map((step, idx) => (
                                                                    <div key={step} className="relative z-10 flex flex-col items-center">
                                                                        <div className={`w-7 h-7 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${
                                                                            idx < currentIdx ? 'bg-green-500 border-green-500 text-white' : 
                                                                            idx === currentIdx ? 'bg-[#0a0a0a] border-green-500 text-green-500 scale-110' : 
                                                                            'bg-[#0a0a0a] border-white/10 text-gray-700'
                                                                        }`}>
                                                                            {idx < currentIdx ? (
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                                            ) : (
                                                                                <span className="text-[8px] font-black">{idx + 1}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className={`mt-3 text-[7px] font-black uppercase tracking-wider text-center max-w-[50px] ${
                                                                            idx <= currentIdx ? 'text-white' : 'text-gray-600'
                                                                        }`}>
                                                                            {step}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </GlassCard>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab Content: RESERVATIONS */}
                        {activeTab === 'reservations' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div>
                                        <h3 className="text-3xl font-serif text-white mb-2">My Bookings</h3>
                                        <p className="text-gray-500 text-sm uppercase tracking-[0.2em] font-bold">Manage your upcoming table experiences</p>
                                    </div>
                                    <Button onClick={() => navigate('/reservation')} className="bg-[#D4AF37] hover:bg-[#E6C86E] text-black h-12 px-8 flex items-center gap-2 font-bold uppercase tracking-wider">
                                        <span className="text-xl">+</span> New Booking
                                    </Button>
                                </div>

                                {reservations?.length === 0 ? (
                                    <div className="text-center py-32 bg-white/[0.02] rounded-[2rem] border border-dashed border-white/10 backdrop-blur-sm">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <span className="text-2xl">🍽️</span>
                                        </div>
                                        <h4 className="text-xl font-medium text-white mb-2">No bookings found</h4>
                                        <p className="text-gray-500 max-w-xs mx-auto">Your upcoming culinary adventures will appear here once you make a reservation.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {reservations.map(res => {
                                            const resDate = new Date(res.reservation_date);
                                            const isPast = resDate < new Date() && res.status !== 'CANCELLED';
                                            
                                            return (
                                                <GlassCard 
                                                    key={`${res.booking_type}-${res.id}-${res.created_at}`} 
                                                    className="p-8 border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-[#D4AF37]/30 transition-all duration-500 group"
                                                >
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                                        <div className="flex flex-col sm:flex-row gap-8 flex-grow">
                                                            {/* Date Badge */}
                                                            <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-b from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/30 flex flex-col items-center justify-center p-2 shadow-lg shadow-black/20 group-hover:scale-105 transition-transform">
                                                                <span className="text-[10px] font-black text-[#D4AF37] opacity-60 uppercase mb-1">{resDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                                                                <span className="text-3xl font-black text-white leading-none">{resDate.getDate()}</span>
                                                                <span className="text-[10px] font-black text-[#D4AF37] opacity-60 uppercase mt-1">{resDate.getFullYear()}</span>
                                                            </div>

                                                            <div className="space-y-4 flex-grow">
                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${
                                                                        res.booking_type === 'TABLE' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                                    }`}>
                                                                        {res.booking_type === 'TABLE' ? 'Table Reservation' : 'Event Package'}
                                                                    </span>
                                                                    <span className="bg-white/5 text-gray-400 text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-white/10">
                                                                        {res.guests} Guests
                                                                    </span>
                                                                </div>

                                                                <div>
                                                                    <h4 className="text-2xl font-serif text-white group-hover:text-[#D4AF37] transition-colors">
                                                                        {res.booking_type === 'TABLE' ? `Dining at ${res.area_name || 'Melissa Court'}` : 'Private Event Celebration'}
                                                                    </h4>
                                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-gray-400 font-medium">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[#D4AF37]">⏰</span> {res.reservation_time}
                                                                        </div>
                                                                        {res.table_number && (
                                                                            <div className="flex items-center gap-2 bg-[#D4AF37]/10 px-3 py-0.5 rounded-lg text-[#D4AF37]/80 text-xs border border-[#D4AF37]/10">
                                                                                <span className="font-black uppercase text-[10px]">Table</span> #{res.table_number}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {res.special_requests && (
                                                                    <div className="bg-white/[0.02] border-l-2 border-[#D4AF37]/40 p-3 rounded-r-xl max-w-md">
                                                                        <p className="text-[10px] text-[#D4AF37]/60 uppercase font-black tracking-widest mb-1">Preferences</p>
                                                                        <p className="text-gray-400 text-xs italic leading-relaxed">"{res.special_requests}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-6 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-10">
                                                            <div className="text-center lg:text-right">
                                                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Booking Status</p>
                                                                <span className={`inline-flex px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${
                                                                    res.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                                                    isPast ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                                }`}>
                                                                    {isPast && res.status === 'PENDING' ? 'COMPLETED' : res.status}
                                                                </span>
                                                            </div>
                                                            
                                                            {res.status !== 'CANCELLED' && !isPast && (
                                                                <button 
                                                                    onClick={() => handleCancelAction('reservation', res.id)}
                                                                    className="group/cancel flex items-center gap-2 px-6 py-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all duration-300 font-bold uppercase text-[10px] tracking-[0.1em]"
                                                                >
                                                                    Cancel Order
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab Content: SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="space-y-8 animate-fade-in">
                                <h3 className="text-2xl font-serif text-white mb-6">Profile Settings</h3>
                                
                                <GlassCard className="p-8 border-white/5 max-w-2xl bg-gradient-to-br from-white/5 to-transparent">
                                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-gray-400 text-xs uppercase font-bold tracking-widest">Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-gray-400 text-xs uppercase font-bold tracking-widest">Contact Phone</label>
                                                <input 
                                                    type="tel" 
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                                                    placeholder="Enter phone number"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-gray-400 text-xs uppercase font-bold tracking-widest">Email Address (Read Only)</label>
                                            <input 
                                                type="email" 
                                                value={profile?.email}
                                                disabled
                                                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed uppercase"
                                            />
                                            <p className="text-[10px] text-gray-600 italic">Contact support to change your registered email.</p>
                                        </div>

                                        <div className="pt-6">
                                            <Button 
                                                type="submit" 
                                                disabled={updateLoading}
                                                className="bg-[#D4AF37] text-black font-bold px-10 h-12"
                                            >
                                                {updateLoading ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </form>
                                </GlassCard>

                                <GlassCard className="p-8 border-red-500/10 bg-red-500/5 max-w-2xl">
                                    <h4 className="text-red-500 font-bold mb-2 uppercase tracking-tighter">Security Center</h4>
                                    <p className="text-gray-400 text-sm mb-6">Need to update your password? Use the secure reset link below.</p>
                                    <Button variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10 h-10 px-6 text-xs">Request Password Reset</Button>
                                </GlassCard>
                            </div>
                        )}


                    </div>
                </div>
            </div>
        </div>
    );
}

export default Account;
