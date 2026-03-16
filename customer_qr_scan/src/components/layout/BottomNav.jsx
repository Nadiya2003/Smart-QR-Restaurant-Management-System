import React from 'react';
import {
  UtensilsIcon,
  ClipboardListIcon,
  ShoppingCartIcon,
  UserIcon
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';

export function BottomNav({ currentPage, onNavigate }) {
  const { itemCount } = useCart();

  const navItems = [
    { id: 'menu', label: 'Menu', icon: UtensilsIcon },
    { id: 'tracking', label: 'Orders', icon: ClipboardListIcon },
    { id: 'cart', label: 'Cart', icon: ShoppingCartIcon, badge: itemCount },
    { id: 'dashboard', label: 'Profile', icon: UserIcon }
  ];

  return (
    <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 pb-safe z-20">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge ? (
                  <span className="absolute -top-1 -right-2 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
