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
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
        isSelected 
          ? 'border-gray-900 ring-2 ring-gray-900/10 bg-gray-50/50 shadow-lg translate-y-[-2px]' 
          : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
      } ${isOffline ? 'opacity-85 grayscale-[0.05]' : 'hover:shadow-md hover:translate-y-[-1px]'}`}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className="relative">
          <div
            className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold transition-all duration-300 ${
              isSelected ? 'ring-4 ring-gray-900/10' : 'ring-2 ring-gray-100'
            } ${isOffline ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-br from-gray-50 to-gray-200 text-gray-700'}`}
          >
            {steward.avatar && !steward.avatar.includes('default') ? (
              <img 
                src={steward.avatar} 
                alt={steward.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<span>${steward.name?.charAt(0) || 'S'}</span>`;
                }}
              />
            ) : (
              <span>{steward.name?.charAt(0) || 'S'}</span>
            )}
          </div>
          {/* Status Indicator Dot */}
          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
            steward.status === 'active' ? 'bg-emerald-500' : 
            steward.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
          }`} />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className={`font-bold transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
              {steward.name}
            </h3>
            <div className="flex flex-col items-end">
              {steward.status === 'active' ? (
                <Badge variant="success" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">Available</Badge>
              ) : steward.status === 'busy' ? (
                <Badge variant="warning" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">Busy</Badge>
              ) : (
                <Badge variant="default" className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-gray-200 text-gray-600">Off Duty</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <StarRating rating={steward.rating} size="sm" readonly />
              <span className="text-xs font-medium text-gray-500">
                {steward.rating?.toFixed ? steward.rating.toFixed(1) : steward.rating}
              </span>
            </div>
            {!isOffline && (
              <div className="h-1 w-1 rounded-full bg-gray-300" />
            )}
            {!isOffline && (
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-tight">
                {steward.activeOrders || 0} Open {steward.activeOrders === 1 ? 'Table' : 'Tables'}
              </span>
            )}
          </div>
          
          {steward.checkInTime && !isOffline && (
            <p className="text-[10px] text-gray-400 mt-1 italic">
              On duty since {new Date(steward.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
      
      {/* Background decoration for selected state */}
      {isSelected && (
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-gray-900/5 rounded-full blur-xl" />
      )}
    </button>
  );
}
