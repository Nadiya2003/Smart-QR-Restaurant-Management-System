import React from 'react';
import { PlusIcon } from 'lucide-react';

export function FoodCard({ menuItem, onAddToCart }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="relative h-32 sm:h-40 w-full bg-gray-100">
        <img
          src={menuItem.image}
          alt={menuItem.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!menuItem.isAvailable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1 mb-1">
          {menuItem.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
          {menuItem.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-gray-900">
            Rs. {menuItem.price.toLocaleString()}
          </span>
          <button
            onClick={() => onAddToCart(menuItem)}
            disabled={!menuItem.isAvailable}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Add ${menuItem.name} to cart`}
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
