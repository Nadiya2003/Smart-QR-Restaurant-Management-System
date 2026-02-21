/**
 * Steward Card Component
 * Displays individual steward profile with selection capability
 * Shows: name, rating, active orders, status
 * Optimized with real world images (fallback to professional avatar)
 */

import Button from './Button';
import GlassCard from './GlassCard';

function StewardCard({
  steward,
  onSelect,
  isSelected = false,
  canSelect = true
}) {
  // Determine status badge color and text
  const getStatusBadge = () => {
    if (steward.status === 'active') {
      return { color: 'text-green-400 bg-green-500/10 border-green-500/20', text: 'Steward Active' };
    } else if (steward.status === 'busy') {
      return { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', text: 'Busy Serving' };
    } else {
      return { color: 'text-red-400 bg-red-500/10 border-red-500/20', text: 'Currently Off' };
    }
  };

  const statusBadge = getStatusBadge();

  // Check if steward is busy (has maximum orders)
  const isBusy = steward.activeOrders >= 5;

  // Determine if card should be dimmed
  const isDimmed = steward.status === 'inactive' || (isBusy && !isSelected);

  // Fallback image handling
  const getStewardAvatar = () => {
    if (steward.avatar && steward.avatar.length > 5 && !steward.avatar.includes('👨‍💼')) {
      return steward.avatar;
    }
    return '/stewards/default.png';
  };

  return (
    <GlassCard
      className={`flex flex-col items-center p-6 text-center cursor-pointer transition-all duration-500 ${isDimmed ? 'opacity-40 grayscale pointer-events-none' : ''
        } ${isSelected
          ? 'ring-2 ring-gold-500 shadow-[0_0_40px_rgba(212,175,55,0.4)] scale-[1.02] bg-white/[0.08]'
          : 'hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]'
        }`}
    >
      {/* Profile Image */}
      <div className={`w-32 h-32 mb-6 rounded-full overflow-hidden border-4 transition-all duration-500 ${isSelected
        ? 'border-gold-500 shadow-[0_0_25px_rgba(212,175,55,0.6)]'
        : 'border-white/10'
        }`}>
        <img
          src={getStewardAvatar()}
          alt={steward.name}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/stewards/steward_1.png';
          }}
        />
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{steward.name}</h3>

      {/* Rating */}
      <div className="bg-black/20 px-4 py-2 rounded-full flex items-center gap-2 mb-6 border border-white/5 backdrop-blur-sm shadow-inner overflow-hidden">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg
              key={i}
              className={`w-4 h-4 transition-all duration-300 ${i < Math.round(steward.rating) ? 'text-gold-500 fill-current' : 'text-white/10'}`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-xs font-black text-gold-500 tracking-tighter">{steward.rating?.toFixed(1) || '5.0'}</span>
      </div>

      {/* Active Orders Count */}
      <div className="flex items-center gap-3 text-sm text-gray-400 mb-6 bg-white/5 px-4 py-1.5 rounded-lg border border-white/5">
        <div className="flex -space-x-2">
          {[...Array(Math.min(steward.activeOrders, 3))].map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-gold-500 border-2 border-[#121212] flex items-center justify-center text-[10px] text-black font-bold">
              {i + 1}
            </div>
          ))}
        </div>
        <span>{steward.activeOrders} Serving Now</span>
      </div>

      {/* Status Badge */}
      <div className={`px-4 py-1 rounded-full mb-6 border text-[11px] font-bold uppercase tracking-widest ${statusBadge.color}`}>
        {statusBadge.text}
      </div>

      {/* Busy Alert */}
      {isBusy && steward.status === 'busy' && (
        <div className="w-full mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Maximum capacity reached</span>
        </div>
      )}

      {/* Select Button */}
      <Button
        onClick={() => onSelect(steward.id)}
        disabled={!canSelect || isBusy || steward.status === 'inactive'}
        className={`w-full py-4 ${isSelected ? 'bg-gold-500 text-black border-transparent' : ''}`}
        variant={isSelected ? 'primary' : 'outline'}
      >
        {isSelected ? 'Ready to Serve' : 'Select Steward'}
      </Button>
    </GlassCard>
  );
}

export default StewardCard;
