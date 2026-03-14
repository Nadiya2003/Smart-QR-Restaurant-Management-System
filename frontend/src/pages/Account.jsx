import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

import AccountAvatar from '../assets/default-customer-avatar.png';

/**
 * Account Page - User Profile and Order History
 * Updated to use standard API endpoints and includes Logout
 */
function Account() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [accountData, setAccountData] = useState({
        profile: null,
        orders: [],
        reservations: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchAccountData();
    }, []);

    const fetchAccountData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/auth');
                return;
            }
            // Using localhost as per standard setup
            const res = await fetch('http://localhost:5000/api/customer/account', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAccountData(data);
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

    const handleCancel = async (type, id) => {
        const confirmBox = window.confirm(`Are you sure you want to cancel this ${type}? This action cannot be undone.`);
        if (!confirmBox) return;

        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            if (type === 'reservation') endpoint = `http://localhost:5000/api/reservations/cancel/${id}`;
            else if (type === 'delivery') endpoint = `http://localhost:5000/api/orders/delivery/cancel/${id}`;
            else if (type === 'takeaway') endpoint = `http://localhost:5000/api/orders/takeaway/cancel/${id}`;

            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Customer requested cancellation from dashboard' })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchAccountData(); // Refresh UI
            } else {
                alert(data.message || 'Cancellation failed');
            }
        } catch (err) {
            console.error('Cancellation error:', err);
            alert('Failed to connect to server');
        }
    };

    if (!isAuthenticated) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
            <GlassCard className="max-w-md w-full text-center p-12 border-[#D4AF37]/20 shadow-2xl">
                <div className="text-6xl mb-6">👤</div>
                <h2 className="text-3xl font-bold text-white mb-2">Member Portal</h2>
                <p className="text-gray-400 mb-10">Please sign in to view your orders, loyalty points, and reservations.</p>
                <Button onClick={() => navigate('/auth')} className="w-full bg-[#D4AF37] text-black font-bold h-14 text-lg shadow-xl shadow-[#D4AF37]/20">
                    Login to My Account
                </Button>
            </GlassCard>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
            <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#D4AF37] font-medium tracking-widest uppercase text-xs">Syncing Your Profile...</p>
        </div>
    );

    // Data extracted with fallbacks
    const { profile, orders, reservations } = accountData || {};

    /**
     * Note: Full-page error block removed to keep the dashboard accessible.
     * Errors are now logged to console and could be shown as toast notifications.
     */


    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="animate-slide-up">
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-2 flex items-center gap-4">
                            My <span className="bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text">Account</span>
                        </h1>
                        <p className="text-gray-500 font-medium tracking-wide">Manage your preferences and view your culinary journey.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile & Stats */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Profile Info Card */}
                        <GlassCard className="p-8 border-[#D4AF37]/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#D4AF37]/10 transition-colors"></div>
                            
                            <div className="text-center relative z-10">
                                <div className="relative inline-block mb-6">
                                    <img 
                                        src={profile?.profile_image ? (profile.profile_image.toString().startsWith('http') ? profile.profile_image : `http://localhost:5000${profile.profile_image}`) : AccountAvatar} 
                                        alt="Avatar" 
                                        className="w-28 h-28 rounded-full border-4 border-[#D4AF37] object-cover shadow-2xl shadow-[#D4AF37]/20"
                                        onError={(e) => e.target.src = AccountAvatar}
                                    />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#D4AF37] rounded-full border-4 border-[#1a1a1a] flex items-center justify-center text-xs">
                                        ✨
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">{profile?.name}</h2>
                                <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-4">Elite Member</p>
                            </div>

                            <div className="space-y-4 pt-6 mt-6 border-t border-white/5 relative z-10">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Email</span>
                                    <span className="text-white text-sm font-medium truncate max-w-[150px]">{profile?.email}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Phone</span>
                                    <span className="text-white text-sm font-medium">{profile?.phone || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-500 text-xs uppercase font-bold tracking-tighter">Joined</span>
                                    <span className="text-white text-sm font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '--'}</span>
                                </div>
                            </div>

                            {/* PREMIUM LOGOUT BUTTON */}
                            <button 
                                onClick={logout}
                                className="w-full mt-8 py-4 px-6 bg-gradient-to-r from-red-500/10 to-red-600/5 hover:from-red-500/20 hover:to-red-600/10 text-red-500 rounded-xl border border-red-500/30 font-bold text-sm transition-all flex items-center justify-center gap-3 active:scale-95 group/logout shadow-lg"
                            >
                                <span className="text-xl group-hover/logout:-translate-x-1 transition-transform">🔒</span>
                                Secure Sign Out
                            </button>

                        </GlassCard>

                        {/* Loyalty Card */}
                        <GlassCard className="p-8 bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30 group">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Loyalty Status</h3>
                                <span className="text-2xl filter drop-shadow-md group-hover:scale-125 transition-transform">⭐</span>
                            </div>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-5xl font-black text-[#D4AF37]">{profile?.loyalty_points || 0}</span>
                                <span className="text-gray-400 font-bold uppercase tracking-tighter text-xs mb-2">Total Points</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-6 font-medium">Earn 1 point for every Rs. 100 spent</p>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-[#D4AF37]">
                                    <span>Progress</span>
                                    <span>{Math.min(100, (profile?.loyalty_points % 500) / 5).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                                        style={{ width: `${Math.min(100, ((profile?.loyalty_points || 0) % 500) / 5)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Right Column: Content Tabs */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <GlassCard className="p-4 text-center border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Total Orders</p>
                                <p className="text-2xl font-bold text-white">{orders?.length || 0}</p>
                            </GlassCard>
                            <GlassCard className="p-4 text-center border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Reservations</p>
                                <p className="text-2xl font-bold text-white">{reservations?.length || 0}</p>
                            </GlassCard>
                            <GlassCard className="p-4 text-center border-[#D4AF37]/20 bg-[#D4AF37]/5">
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Loyalty Points</p>
                                <p className="text-2xl font-bold text-[#D4AF37]">{profile?.loyalty_points || 0}</p>
                            </GlassCard>
                            <GlassCard className="hidden md:block p-4 text-center border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Status</p>
                                <p className="text-2xl font-bold text-green-500">Active</p>
                            </GlassCard>
                        </div>

                        {/* Recent Reservations */}
                        <GlassCard className="p-8 border-white/5">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white">My Reservations</h3>
                                <Button onClick={() => navigate('/reservation')} size="sm" variant="outline" className="text-xs">Book Table</Button>
                            </div>

                            {!reservations || reservations.length === 0 ? (
                                <div className="text-center py-10 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                                    <p className="text-gray-500 text-sm">No upcoming reservations found.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reservations.map(res => (
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center text-xl">📅</div>
                                                    <div>
                                                        <p className="font-bold text-white">Table for {res.guests}</p>
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold">{new Date(res.reservation_date).toLocaleDateString()} at {res.reservation_time}</p>
                                                        {res.status_notes && <p className="text-[9px] text-gray-400 mt-1 italic">{res.status_notes}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                                                        res.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                        {res.status || 'Confirmed'}
                                                    </span>
                                                    {res.status !== 'CANCELLED' && res.status !== 'COMPLETED' && (
                                                        <button 
                                                            onClick={() => handleCancel('reservation', res.id)}
                                                            className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors border-b border-red-500/0 hover:border-red-500/50"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                    ))}
                                </div>
                            )}
                        </GlassCard>

                        {/* Order History */}
                        <GlassCard className="p-8 border-white/5">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-bold text-white">Recent Orders</h3>
                                <span className="text-[10px] bg-white/5 text-gray-400 px-3 py-1.5 rounded-full uppercase tracking-widest font-bold">Past 10 Activity</span>
                            </div>

                            {!orders || orders.length === 0 ? (
                                <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                    <div className="text-6xl mb-6 opacity-20">🍽️</div>
                                    <h4 className="text-xl font-bold text-white mb-2">No Order History</h4>
                                    <p className="text-gray-500 max-w-xs mx-auto mb-8 text-sm">You haven&apos;t placed any orders yet. Explore our menu to start!</p>
                                    <Button onClick={() => navigate('/menu')} className="bg-[#D4AF37] text-black shadow-xl shadow-[#D4AF37]/20 px-8">
                                        Browse Menu
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map((order) => (
                                        <div key={`${order.type}-${order.id}`} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/[0.02] transition-all gap-4">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                                                    {order.type === 'DELIVERY' ? '🚚' : '🛍️'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <p className="font-bold text-lg text-white">Order #{order.id}</p>
                                                        <span className="text-[9px] bg-white/10 text-gray-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">{order.type}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    {order.status_notes && <p className="text-[10px] text-[#D4AF37]/60 mt-1 italic max-w-[200px] truncate">{order.status_notes}</p>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-start sm:items-end w-full sm:w-auto gap-3">
                                                <div className="text-left sm:text-right">
                                                    <p className="text-xl font-black text-[#D4AF37] mb-2 leading-none">Rs. {Number(order.total_price).toLocaleString()}</p>
                                                    <span className={`text-[9px] uppercase font-black px-3 py-1 rounded-full shadow-sm tracking-[0.1em] ${
                                                        order.order_status?.toUpperCase() === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 
                                                        order.order_status?.toUpperCase() === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                                                        order.order_status?.toUpperCase() === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                                                        'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                                    }`}>
                                                        {order.order_status || 'CONFIRMED'}
                                                    </span>
                                                </div>
                                                {order.order_status?.toUpperCase() !== 'CANCELLED' && order.order_status?.toUpperCase() !== 'COMPLETED' && (
                                                    <button 
                                                        onClick={() => handleCancel(order.type.toLowerCase(), order.id)}
                                                        className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/5 transition-all"
                                                    >
                                                        Cancel Order
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="mt-8 pt-8 border-t border-white/5">
                                        <button 
                                            onClick={() => navigate('/menu')}
                                            className="w-full py-4 text-gray-500 hover:text-[#D4AF37] font-bold text-sm transition-all flex items-center justify-center gap-2 hover:bg-white/5 rounded-2xl"
                                        >
                                            View Full History Archive
                                        </button>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* Global Logout Button - At the bottom as requested */}
                        <div className="flex justify-center pt-8">
                            <button 
                                onClick={logout}
                                className="px-10 py-4 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-2xl border border-white/10 hover:border-red-500/30 font-bold transition-all flex items-center gap-3 group"
                            >
                                <span>🔒</span>
                                Logout from Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Account;
