import React from 'react';
import { MinusIcon, PlusIcon, TrashIcon } from 'lucide-react';

export function CartItem({ item, onUpdateQuantity, onRemove }) {
  const { menuItem, quantity } = item;
  
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0 bg-white">
      <img
        src={menuItem.image}
        alt={menuItem.name}
        className="w-16 h-16 rounded-lg object-cover bg-gray-100"
      />

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{menuItem.name}</h4>
        <div className="text-gray-900 font-semibold mt-1">
          Rs. {(menuItem.price * quantity).toLocaleString()}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 p-1">
          <button
            onClick={() => onUpdateQuantity(menuItem.id, quantity - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-white hover:shadow-sm transition-colors"
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <span className="w-6 text-center font-medium text-sm">
            {quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(menuItem.id, quantity + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-white hover:shadow-sm transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onRemove(menuItem.id)}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          aria-label="Remove item"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
