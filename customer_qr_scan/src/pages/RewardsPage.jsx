import React, { useState, useEffect } from 'react';
import { AwardIcon, StarIcon, GiftIcon, TrendingUpIcon, CheckCircleIcon, ShoppingBagIcon, TicketIcon, ClockIcon } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';

const TIERS = [
  { name: 'Bronze', min: 0,   max: 100,  color: '#CD7F32', bg: '#FEF3E8', icon: '🥉' },
  { name: 'Silver', min: 100, max: 300,  color: '#9CA3AF', bg: '#F3F4F6', icon: '🥈' },
  { name: 'Gold',   min: 300, max: 600,  color: '#F59E0B', bg: '#FEF9C3', icon: '🥇' },
  { name: 'Platinum', min: 600, max: Infinity, color: '#818CF8', bg: '#EEF2FF', icon: '💎' },
];

export function RewardsPage({ onNavigate }) {
  const { user } = useAuth();
  const { orderHistory } = useOrder();
  const [availableRewards, setAvailableRewards] = useState([]);
  const [myCoupons, setMyCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');

  const points = user?.loyalty_points || 0;
  const tier = TIERS.find(t => points >= t.min && points < t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.findIndex(t => t.name === tier.name) + 1];
  const progressToNext = nextTier
    ? Math.min(((points - tier.min) / (nextTier.min - tier.min)) * 100, 100)
    : 100;

  const completedOrders = orderHistory.filter(o =>
    ['COMPLETED', 'PAID', 'FINISHED'].includes(o.status?.toUpperCase())
  ).length;

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const [rewardsData, couponsData] = await Promise.all([
        api.get('/customer/rewards'),
        api.get('/customer/my-rewards')
      ]);
      setAvailableRewards(rewardsData.rewards || []);
      setMyCoupons(couponsData.myRewards || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId) => {
    try {
      const res = await api.post('/customer/redeem', { rewardId });
      alert(res.message);
      fetchRewards();
      // Optionally trigger a profile refresh to sync points
      // fetchProfile(); from useAuth if available
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header
        title="Rewards Portal"
        showBack
        onBack={() => onNavigate('dashboard')}
        onNavigate={onNavigate}
      />

      <div className="p-4 flex-1 space-y-6">

        {/* Points Summary Card */}
        <div
          className="rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tier.color}, ${tier.color}aa)` }}
        >
          {/* Decorative Circle */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Current Balance</span>
                  <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">LIFETIME HERO</div>
                </div>
                <h2 className="text-6xl font-black tracking-tight">{points.toLocaleString()}</h2>
                <div className="flex items-center gap-2 mt-2 opacity-80">
                  <AwardIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tier.name} Status</span>
                </div>
              </div>
              <div className="text-5xl bg-white/20 p-4 rounded-3xl backdrop-blur-md border border-white/30 shadow-lg leading-none">
                {tier.icon}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-white">
                <span>{tier.name}</span>
                <span>{nextTier ? `${nextTier.name} in ${nextTier.min - points} pts` : 'Max Tier Reached!'}</span>
              </div>
              <div className="w-full bg-black/10 rounded-full h-3.5 border border-white/10 p-0.5">
                <div
                  className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex bg-gray-200/50 p-1.5 rounded-[1.5rem] backdrop-blur-sm border border-gray-100">
           <button 
             onClick={() => setActiveTab('available')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.1rem] text-sm font-bold transition-all ${
               activeTab === 'available' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
             }`}
           >
             <GiftIcon className="w-4 h-4" />
             Store
           </button>
           <button 
             onClick={() => setActiveTab('my')}
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.1rem] text-sm font-bold transition-all ${
               activeTab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
             }`}
           >
             <TicketIcon className="w-4 h-4" />
             My Wallet
           </button>
        </div>

        {/* Content Area */}
        {activeTab === 'available' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Available Rewards</h3>
              <span className="text-xs text-gray-400 font-bold">{availableRewards.length} Items</span>
            </div>
            
            {availableRewards.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {availableRewards.map(reward => (
                  <div key={reward.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                    <div className="bg-amber-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner">
                      {reward.reward_type === 'FREE_ITEM' ? '🍰' : '🎁'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{reward.name}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{reward.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="bg-amber-100 px-2.5 py-1 rounded-full text-[10px] font-black text-amber-700 uppercase">
                          {reward.points_cost} Points
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRedeem(reward.id)}
                      disabled={points < reward.points_cost}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                        points >= reward.points_cost 
                        ? 'bg-gray-900 text-white active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {points >= reward.points_cost ? 'REDEEM' : 'LOCKED'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                    <ShoppingBagIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No rewards available right now</p>
                </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Active Coupons</h3>
               <span className="text-xs text-gray-400 font-bold">{myCoupons.length} Active</span>
            </div>

            {myCoupons.length > 0 ? (
              <div className="space-y-4">
                {myCoupons.map(coupon => (
                  <div 
                    key={coupon.id} 
                    className="relative bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-lg group active:scale-[0.98] transition-transform"
                  >
                    {/* Dash line */}
                    <div className="absolute left-[22%] top-0 bottom-0 w-[2px] bg-dashed border-l-2 border-dashed border-gray-200 z-10"></div>
                    
                    <div className="flex h-32">
                      <div className="w-[23%] bg-gray-50 flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase vertical-rl rotate-180">MelissasFC</span>
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center mt-2">
                           <TicketIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                      
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                             <h4 className="font-black text-gray-900 leading-tight">{coupon.name}</h4>
                             <div className="bg-green-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-green-700">ACTIVE</div>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">CODE: {coupon.coupon_code}</p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1.5 text-gray-400">
                              <ClockIcon className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">Exp: {new Date(coupon.expiry_date).toLocaleDateString()}</span>
                           </div>
                           <button className="bg-gray-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-gray-200">View QR</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-200">
                <TicketIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Your wallet is empty</p>
                <button 
                  onClick={() => setActiveTab('available')}
                  className="mt-4 text-amber-600 font-bold text-sm"
                >
                  Visit the Rewards Store
                </button>
              </div>
            )}
          </div>
        )}

        {/* Earning Rules Info */}
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
          <h3 className="font-black text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-tighter">
            <TrendingUpIcon className="w-5 h-5 text-amber-500" />
            How to earn Points
          </h3>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl mb-3 shadow-sm">💳</div>
                <p className="text-xs font-bold text-gray-900">Standard Spend</p>
                <p className="text-[10px] text-gray-500 mt-1">Earn 1 pt for every Rs. 100 spent on any order.</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl mb-3 shadow-sm">🚀</div>
                <p className="text-xs font-bold text-gray-900">Bonus Items</p>
                <p className="text-[10px] text-gray-500 mt-1">Look for items with bonus points icons in the menu.</p>
             </div>
          </div>
        </div>

      </div>

      <BottomNav currentPage="dashboard" onNavigate={onNavigate} />
    </div>
  );
}
