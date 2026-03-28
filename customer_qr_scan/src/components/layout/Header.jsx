import React from 'react';
import { ChevronLeftIcon, MapPinIcon } from 'lucide-react';
import { useOrder } from '../../hooks/useOrder';

export function Header({
  title,
  showBack = false,
  onBack,
  rightAction,
  onNavigate,
  hideTable = false
}) {
  const { tableNumber } = useOrder();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center flex-1 overflow-hidden">
        {showBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 mr-1 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded-full transition-colors shrink-0"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
        {!hideTable && (
          <div className="flex items-center gap-2 min-w-0">
             <div className="bg-amber-100 p-2 rounded-xl shrink-0">
                <MapPinIcon className="w-4 h-4 text-amber-600" />
             </div>
             <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Dining at</span>
                <span className="text-sm font-bold text-gray-900 leading-tight truncate">Table {tableNumber || '--'}</span>
             </div>
          </div>
        )}
      </div>

      <h1 className="text-md font-bold text-gray-900 flex-1 text-center truncate px-2">
        {title}
      </h1>

      <div className="flex items-center justify-end flex-1 gap-2">
        {rightAction || (
           !showBack && (
            <button 
              onClick={() => onNavigate && onNavigate('change-table')}
              className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-bold uppercase transition-all"
            >
              Change
            </button>
           )
        )}
      </div>
    </header>
  );
}
