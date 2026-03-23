import React from 'react';
import { AwardIcon, StarIcon, GiftIcon, TrendingUpIcon, CheckCircleIcon } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';

const TIERS = [
  { name: 'Bronze', min: 0,   max: 100,  color: '#CD7F32', bg: '#FEF3E8', icon: '🥉' },
  { name: 'Silver', min: 100, max: 300,  color: '#9CA3AF', bg: '#F3F4F6', icon: '🥈' },
  { name: 'Gold',   min: 300, max: 600,  color: '#F59E0B', bg: '#FEF9C3', icon: '🥇' },
  { name: 'Platinum', min: 600, max: Infinity, color: '#818CF8', bg: '#EEF2FF', icon: '💎' },
];

export function RewardsPage({ onNavigate }) {
  const { user } = useAuth();
  const { orderHistory } = useOrder();

  const points = user?.loyalty_points || 0;
  const tier = TIERS.find(t => points >= t.min && points < t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.findIndex(t => t.name === tier.name) + 1];
  const progressToNext = nextTier
    ? Math.min(((points - tier.min) / (nextTier.min - tier.min)) * 100, 100)
    : 100;

  const completedOrders = orderHistory.filter(o =>
    ['COMPLETED', 'PAID', 'FINISHED'].includes(o.status?.toUpperCase())
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header
        title="My Rewards"
        showBack
        onBack={() => onNavigate('dashboard')}
        onNavigate={onNavigate}
      />

      <div className="p-4 flex-1 space-y-5">

        {/* Points Card */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl"
          style={{ background: `linear-gradient(135deg, ${tier.color}ee, ${tier.color}88)` }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-1">Loyalty Points</p>
              <h2 className="text-5xl font-black">{points.toLocaleString()}</h2>
              <p className="text-white/70 text-xs mt-1">{completedOrders} orders completed</p>
            </div>
            <div className="text-4xl">{tier.icon}</div>
          </div>

          <div className="mb-2 flex justify-between text-xs font-bold text-white/80">
            <span>{tier.name}</span>
            <span>{nextTier ? `${nextTier.name} — ${nextTier.min - points} pts away` : 'Top Tier! 🎉'}</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-3">
            <div
              className="bg-white h-3 rounded-full transition-all duration-700"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>

        {/* Tier Benefits */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-amber-500" />
            Membership Tiers
          </h3>
          <div className="space-y-3">
            {TIERS.map(t => (
              <div
                key={t.name}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  tier.name === t.name ? 'border-2 shadow-sm' : 'border-gray-100'
                }`}
                style={tier.name === t.name ? { borderColor: t.color, background: t.bg } : {}}
              >
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: t.color }}>{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.max === Infinity ? `${t.min}+ pts` : `${t.min}–${t.max} pts`}
                  </p>
                </div>
                {tier.name === t.name && (
                  <CheckCircleIcon className="w-5 h-5" style={{ color: t.color }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Perks */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GiftIcon className="w-5 h-5 text-indigo-500" />
            How to Earn Points
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Complete a dine-in order', pts: '+10 pts', icon: '🍽️' },
              { label: 'Order above Rs. 2000', pts: '+20 pts', icon: '💰' },
              { label: 'Weekend visit bonus', pts: '+5 pts', icon: '📅' },
              { label: 'Refer a friend', pts: '+50 pts', icon: '🤝' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <p className="flex-1 text-sm text-gray-700">{item.label}</p>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {item.pts}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav currentPage="dashboard" onNavigate={onNavigate} />
    </div>
  );
}
