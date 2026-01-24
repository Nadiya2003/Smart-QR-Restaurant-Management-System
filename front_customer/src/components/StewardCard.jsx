/**
 * Steward Card Component
 * Displays individual steward profile with selection capability
 * Shows: name, rating, active orders, status
 * Handles disable logic for busy/inactive stewards
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
      return { color: 'bg-green-500', icon: '🟢', text: 'Active' };
    } else if (steward.status === 'busy') {
      return { color: 'bg-yellow-500', icon: '🟡', text: 'Busy' };
    } else {
      return { color: 'bg-red-500', icon: '🔴', text: 'Inactive' };
    }
  };

  const statusBadge = getStatusBadge();
  
  // Check if steward is busy (has maximum orders)
  const isBusy = steward.activeOrders >= 5;

  // Determine if card should be dimmed
  const isDimmed = steward.status === 'inactive' || (isBusy && !isSelected);

  return (
    <GlassCard
      className={`flex flex-col items-center p-6 text-center cursor-pointer transition-smooth ${
        isDimmed ? 'opacity-50 pointer-events-none' : ''
      } ${
        isSelected ? 'ring-2 ring-gold-500' : ''
      }`}
    >
      {/* Profile Image */}
      <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-4xl">
        {steward.avatar}
      </div>

      {/* Name */}
      <h3 className="text-lg font-bold text-white mb-2">{steward.name}</h3>

      {/* Rating */}
      <div className="flex items-center justify-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < steward.rating ? 'text-gold-500' : 'text-gray-600'}>
            ⭐
          </span>
        ))}
        <span className="text-xs text-gray-400 ml-2">({steward.rating}.0)</span>
      </div>

      {/* Active Orders Count */}
      <div className="text-sm text-gray-400 mb-4">
        <span className="text-gold-500 font-bold">{steward.activeOrders}</span>
        <span> / 5 Orders</span>
      </div>

      {/* Status Badge */}
      <div className={`flex items-center justify-center gap-2 px-3 py-1 rounded-full mb-4 ${statusBadge.color}/20 border ${statusBadge.color}/40`}>
        <span>{statusBadge.icon}</span>
        <span className="text-xs font-medium text-white">{statusBadge.text}</span>
      </div>

      {/* Busy Alert (shows when steward has max orders) */}
      {isBusy && steward.status === 'busy' && (
        <div className="w-full mb-4 px-3 py-2 bg-gold-500/10 border border-gold-500/30 rounded-lg text-xs text-gold-300">
          ⚠️ Steward is currently busy
        </div>
      )}

      {/* Select Button */}
      <Button
        onClick={() => onSelect(steward.id)}
        disabled={!canSelect || isBusy || steward.status !== 'active'}
        className="w-full"
      >
        {isSelected ? '✓ Selected' : 'Select'}
      </Button>
    </GlassCard>
  );
}



export default StewardCard;
