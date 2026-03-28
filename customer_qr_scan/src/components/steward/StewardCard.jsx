import React from 'react';
import { UserIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { StarRating } from '../ui/StarRating';

export function StewardCard({
  steward,
  isSelected,
  onSelect
}) {
  const isOffline = steward.status === 'offline';

  return (
    <button
      onClick={() => onSelect(steward)}
      disabled={isOffline}
      className={`w-full text-left p-4 rounded-xl border ${isSelected ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-300'} ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold ${isSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          {steward.avatar && !steward.avatar.includes('default') ? (
            <img 
              src={steward.avatar} 
              alt={steward.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = steward.name?.charAt(0) || 'S';
              }}
            />
          ) : (
            <span>{steward.name?.charAt(0) || 'S'}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{steward.name}</h3>
            {steward.status === 'active' ? (
              <Badge variant="success">Available</Badge>
            ) : steward.status === 'busy' ? (
              <Badge variant="warning">Busy</Badge>
            ) : (
              <Badge variant="default">Off Duty</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <StarRating rating={steward.rating} size="sm" readonly />
            <span>({steward.rating?.toFixed ? steward.rating.toFixed(1) : steward.rating})</span>
          </div>

          {steward.status !== 'offline' && (
            <p className="text-xs text-gray-400 mt-1">{steward.activeOrders || 0} active order{steward.activeOrders !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    </button>
  );
}
