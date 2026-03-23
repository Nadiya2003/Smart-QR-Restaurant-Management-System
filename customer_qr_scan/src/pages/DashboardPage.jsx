import React from 'react';
import {
  UserIcon,
  ClockIcon,
  CreditCardIcon,
  SettingsIcon,
  LogOutIcon,
  AwardIcon,
  LockIcon,
  MapPinIcon
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';

export function DashboardPage({ onNavigate }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentOrder, orderHistory, clearOrder } = useOrder();
  
  const hasOrders = currentOrder !== null || orderHistory.length > 0;

  // Display Guest data if not logged in
  const displayName = isAuthenticated ? user?.name : 'Guest';
  const displayEmail = isAuthenticated ? user?.email : 'Anonymous Session';
  const showStats = isAuthenticated;

  const handleLogout = async () => {
    logout();
    await clearOrder();
    localStorage.removeItem('guestSession'); // Clean guest portal flag too
    onNavigate('welcome');
  };

  const restrictedAction = (target) => {
    if (!isAuthenticated) {
      alert("🔒 This feature is only available to Login Portal.\n\nGo to your Profile tab → 'Login / Register' to switch to the registered portal.");
      return;
    }
    onNavigate(target);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header
        title="My Account"
        onNavigate={onNavigate}
        rightAction={
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 p-2 transition-colors flex items-center gap-2 group"
          >
            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
              {isAuthenticated ? 'Logout' : 'End Session'}
            </span>
            <LogOutIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Profile Header */}
        {isAuthenticated ? (
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xl uppercase ring-4 ring-white shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 rounded-2xl p-5 mb-6 border border-amber-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-amber-200 flex-shrink-0">
                 <UserIcon className="w-7 h-7" />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-amber-900">Guest Session</h2>
                 <p className="text-amber-700/60 text-xs font-medium uppercase tracking-wider">Browsing anonymously</p>
              </div>
            </div>
            <div className="border-t border-amber-100 pt-4 flex gap-2">
              <button
                onClick={() => onNavigate('auth-selection')}
                className="flex-1 text-center bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
              >
                Login / Register
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 text-center bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-bold border border-red-100 hover:bg-red-100 transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        )}

        {/* Loyalty Card - Only for Registered Users */}
        {showStats && (
          <div className="bg-gray-900 rounded-2xl p-6 text-white mb-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-300 text-sm font-medium mb-1">
                  Loyalty Points
                </p>
                <h3 className="text-3xl font-bold">{user.loyalty_points || 0}</h3>
              </div>
              <AwardIcon className="w-8 h-8 text-gray-300" />
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="bg-white h-2 rounded-full"
                style={{
                  width: `${Math.min((user.loyalty_points || 0) % 100, 100)}%`
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-300">{100 - ((user.loyalty_points || 0) % 100)} points until next reward</p>
          </div>
        )}

        {/* guest welcome message or banner if no loyalty points */}
        {!showStats && (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm text-center">
            <p className="text-gray-600 mb-4">You are currently using the system as a Guest.</p>
            <Button variant="secondary" onClick={() => onNavigate('login')}>Login to earn points</Button>
          </div>
        )}

        {/* Actions Grid */}
        <h3 className="font-semibold text-gray-900 mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => restrictedAction('history')}
            className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 hover:border-gray-300 transition-colors"
          >
            {isAuthenticated ? (
              <ClockIcon className="w-6 h-6 text-gray-900" />
            ) : (
              <LockIcon className="w-6 h-6 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-700">
              Order History
            </span>
          </button>

          <button
            onClick={() => {
              if (!hasOrders) return;
              restrictedAction('payment');
            }}
            disabled={!hasOrders}
            className={`bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-colors ${!hasOrders ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
          >
            {hasOrders ? (
              isAuthenticated ? (
                <CreditCardIcon className="w-6 h-6 text-gray-900" />
              ) : (
                <LockIcon className="w-6 h-6 text-gray-400" />
              )
            ) : (
              <LockIcon className="w-6 h-6 text-gray-400" />
            )}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-700">
                Online Payment
              </span>
              {!hasOrders && (
                <span className="text-[10px] text-gray-400 mt-1">
                  Place an order first
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => restrictedAction('rewards')}
            className={`bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-colors hover:border-gray-300`}
          >
            {isAuthenticated ? (
              <AwardIcon className="w-6 h-6 text-gray-900" />
            ) : (
              <LockIcon className="w-6 h-6 text-gray-400" />
            )}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-700">Rewards</span>
              {!isAuthenticated && (
                <span className="text-[10px] text-gray-400 mt-1">
                  Login Required
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => restrictedAction('settings')}
            className={`bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-colors hover:border-gray-300`}
          >
            {isAuthenticated ? (
              <SettingsIcon className="w-6 h-6 text-gray-900" />
            ) : (
              <LockIcon className="w-6 h-6 text-gray-400" />
            )}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-700">Settings</span>
              {!isAuthenticated && (
                <span className="text-[10px] text-gray-400 mt-1">Login Required</span>
              )}
            </div>
          </button>

          <button
            onClick={() => onNavigate('change-table')}
            className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 hover:border-amber-300 transition-colors"
          >
            <div className="bg-amber-100 p-2 rounded-lg">
              <MapPinIcon className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Change Table</span>
          </button>
        </div>
      </div>

      <BottomNav currentPage="dashboard" onNavigate={onNavigate} />
    </div>
  );
}
