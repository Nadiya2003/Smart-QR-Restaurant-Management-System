/**
 * Header Component
 * Sticky navigation bar with logo, menu links, notifications, and profile
 * Shows navigation links on desktop
 * Mobile navigation handled by BottomNav component
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';

function Header({ userRole = 'customer', isLoggedIn = false, mode = 'default' }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth, selectedSteward, customerData } = useCustomer();

  // Handle logout logic
  const handleLogout = () => {
    // Reset mock state and redirect to role selection
    localStorage.removeItem('customerAuth');
    localStorage.removeItem('selectedSteward');
    refreshAuth();
    navigate('/');
  };

  const isStewardMode = mode === 'steward';
  const isMenuMode = mode === 'menu';

  return (
    <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Melissa's Logo" className="h-12 w-auto object-contain" />
            <span className="text-xl font-bold bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300 bg-clip-text text-transparent hidden sm:inline">
              Melissa's Food Court
            </span>
          </Link>

          {!isStewardMode && (
            <>
              {/* Login/Member Section */}
              {isLoggedIn ? (
                <div className="flex items-center gap-4">
                  {/* Selected Steward Badge */}
                  {selectedSteward && (
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 border border-gold-500/20 rounded-full">
                      <span className="text-xs text-gold-500 font-bold uppercase tracking-wider">Your Steward:</span>
                      <span className="text-sm text-white font-medium">{selectedSteward.name}</span>
                    </div>
                  )}

                  {/* Desktop Navigation Links - Shown only in Full mode */}
                  <nav className="hidden md:flex items-center gap-8 mr-4">
                    <Link to="/customer/menu" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">Menu</Link>
                    <Link to="/customer/dashboard" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">Dashboard</Link>
                    <Link to="/customer/payments" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm">Payments</Link>
                  </nav>

                  {/* Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-smooth"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center">
                        <span className="text-black font-bold text-sm">{customerData?.name?.[0] || 'U'}</span>
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur border border-white/10 rounded-lg shadow-xl">
                        <Link to="/customer/dashboard" className="block px-4 py-3 text-gray-300 hover:text-gold-500 hover:bg-white/5 transition-smooth">
                          My Dashboard
                        </Link>
                        <Link to="/customer/settings" className="block px-4 py-3 text-gray-300 hover:text-gold-500 hover:bg-white/5 transition-smooth">
                          Account Settings
                        </Link>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-gray-300 hover:text-red-500 hover:bg-white/5 transition-smooth border-t border-white/10">
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Payments only shown in default mode, not menu-guest mode */}
                  {!isMenuMode && (
                    <Link to="/customer/payments" className="text-gray-300 hover:text-gold-500 transition-smooth text-sm font-medium">
                      Payments
                    </Link>
                  )}
                  <Link
                    to="/customer/login"
                    className="px-6 py-2 rounded-lg bg-gold-500 text-black font-bold hover:bg-gold-400 transition-smooth"
                  >
                    Login
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
