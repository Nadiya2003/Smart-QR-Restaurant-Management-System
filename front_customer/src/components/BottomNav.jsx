/**
 * Bottom Navigation Component
 * Mobile-only navigation bar
 * Shows at bottom of screen on mobile devices
 * Hidden on desktop (use Sidebar instead)
 */

import { Link, useLocation } from 'react-router-dom';

function BottomNav() {
  const location = useLocation();

  // Navigation items with icons
  const navItems = [
    { path: '/customer/menu', label: 'Menu', icon: '🍽️' },
    { path: '/customer/dashboard', label: 'Orders', icon: '📦' },
    { path: '/customer/payments', label: 'Pay', icon: '💳' },
    { path: '/customer/reservations', label: 'Book', icon: '📅' },
    { path: '/customer/settings', label: 'More', icon: '⚙️' },
  ];

  // Check if link is active
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-black/80 backdrop-blur-lg border-t border-white/10">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-smooth ${
              isActive(item.path) ? 'text-gold-500' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
