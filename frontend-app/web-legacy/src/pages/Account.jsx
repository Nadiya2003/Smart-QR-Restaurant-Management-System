import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function Account() {
    const { user } = useAuth();
    const [accountData, setAccountData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAccountData();
    }, []);

    const fetchAccountData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://192.168.1.2:5000/api/customer/account', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAccountData(data);
            }
        } catch (err) {
            console.error('Failed to fetch account data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gold-500">Loading Account...</div>;

    const { profile, orders } = accountData || {};

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="mb-12">
                <h1 className="text-4xl font-bold mb-2">My Account</h1>
                <p className="text-gray-400">Manage your profile and view your rewards</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Information */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="p-8 border-gold-500/20">
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full mx-auto flex items-center justify-center text-4xl font-bold text-black mb-4">
                                {profile?.name?.charAt(0) || 'U'}
                            </div>
                            <h2 className="text-2xl font-bold">{profile?.name}</h2>
                            <p className="text-gray-400 text-sm">{profile?.email}</p>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Phone</span>
                                <span className="text-white font-medium">{profile?.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Joined</span>
                                <span className="text-white font-medium">{new Date(profile?.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Loyalty Points Card */}
                    <GlassCard className="p-8 bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/30">
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-4xl text-gold-500">⭐</span>
                            <div>
                                <h3 className="text-xl font-bold text-gold-500">Loyalty Points</h3>
                                <p className="text-gray-400 text-xs">Earn points on every order</p>
                            </div>
                        </div>
                        <div className="text-4xl font-black text-white">
                            {profile?.loyalty_points || 0} <span className="text-sm font-normal text-gray-400">pts</span>
                        </div>
                        <p className="mt-4 text-sm text-gray-300">
                            You're {500 - (profile?.loyalty_points % 500)} points away from your next reward!
                        </p>
                        <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-gold-500 h-full transition-all duration-1000"
                                style={{ width: `${(profile?.loyalty_points % 500) / 5}%` }}
                            ></div>
                        </div>
                    </GlassCard>
                </div>

                {/* Order History */}
                <div className="lg:col-span-2">
                    <GlassCard className="p-8 h-full">
                        <h3 className="text-2xl font-bold mb-8">Order History</h3>

                        {orders?.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">You haven't placed any orders yet.</p>
                                <Button className="mt-6" variant="primary" onClick={() => window.location.href = '/menu'}>Start Ordering</Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders?.map((order) => (
                                    <div key={order.id} className="group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-transparent hover:border-gold-500/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-2xl">
                                                📦
                                            </div>
                                            <div>
                                                <p className="font-bold">Order #{order.id}</p>
                                                <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-6">
                                            <div>
                                                <p className="text-gold-500 font-bold">Rs. {order.total_price}</p>
                                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${order.order_status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-gold-500/20 text-gold-500'
                                                    }`}>
                                                    {order.order_status}
                                                </span>
                                            </div>
                                            <button className="p-2 text-gray-500 hover:text-white transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default Account;
