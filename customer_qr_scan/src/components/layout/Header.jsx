import React from 'react';
import { ChevronLeftIcon } from 'lucide-react';

export function Header({
  title,
  showBack = false,
  onBack,
  rightAction
}) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4">
      <div className="flex items-center flex-1">
        {showBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center truncate px-2">
        {title}
      </h1>

      <div className="flex items-center justify-end flex-1">{rightAction}</div>
    </header>
  );
}
