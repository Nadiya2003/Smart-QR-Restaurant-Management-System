/**
 * Sidebar Component
 * Desktop navigation sidebar
 * Shows on desktop (md: breakpoint and above)
 * Hides on mobile (use BottomNav instead)
 */

import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();

  // Navigation links with icons
  const navLinks = [
    { path: '/customer/menu', label: 'Menu', icon: '🍽️' },
    { path: '/customer/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/customer/payments', label: 'Payments', icon: '💳' },
    { path: '/customer/reservations', label: 'Reservations', icon: '📅' },
    { path: '/customer/settings', label: 'Settings', icon: '⚙️' },
  ];

  // Check if link is active
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-black/40 backdrop-blur border-r border-white/10 p-6 gap-4">
      {/* Navigation Links */}
      <nav className="flex flex-col gap-2">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth ${
              isActive(link.path)
                ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="mt-auto pt-6 border-t border-white/10">
        <p className="text-xs text-gray-500 text-center">
          © 2025 Melissa's Food Court
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
