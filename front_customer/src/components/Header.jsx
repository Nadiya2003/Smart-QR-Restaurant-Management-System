/**
 * Header Component
 * Sticky navigation bar with logo, menu links, notifications, and profile
 * Shows navigation links on desktop
 * Mobile navigation handled by BottomNav component
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Header({ userRole = 'customer', isLoggedIn = false }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  // Handle logout logic
  const handleLogout = () => {
    // Reset mock state and redirect to role selection
    localStorage.removeItem('customerAuth');
    localStorage.removeItem('selectedSteward');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">
              Melissa's Food Court
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {isLoggedIn && userRole === 'customer' && (
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/customer/menu" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">
                Menu
              </Link>
              <Link to="/customer/dashboard" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">
                Dashboard
              </Link>
              <Link to="/customer/payments" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">
                Payments
              </Link>
              <Link to="/customer/reservations" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">
                Reservations
              </Link>
            </nav>
          )}

          {/* Right Section: Notifications & Profile */}
          {isLoggedIn && (
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button className="relative p-2 hover:bg-white/10 rounded-lg transition-smooth">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-gold-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-smooth"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">K</span>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur border border-white/10 rounded-lg shadow-xl">
                    <Link
                      to="/customer/settings"
                      className="block px-4 py-3 text-gray-300 hover:text-gold-500 hover:bg-white/5 transition-smooth"
                    >
                      Account Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-gray-300 hover:text-red-500 hover:bg-white/5 transition-smooth border-t border-white/10"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

