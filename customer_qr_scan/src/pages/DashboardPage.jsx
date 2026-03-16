import React from 'react';
import {
  UserIcon,
  ClockIcon,
  CreditCardIcon,
  SettingsIcon,
  LogOutIcon,
  AwardIcon,
  LockIcon
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';

export function DashboardPage({ onNavigate }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentOrder, orderHistory } = useOrder();
  
  const hasOrders = currentOrder !== null || orderHistory.length > 0;

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="My Account" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Not Logged In
          </h2>
          <p className="text-gray-500 mb-8">
            Login to view your loyalty points and order history.
          </p>
          <button
            onClick={() => onNavigate('login')}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Login / Register
          </button>
        </div>
        <BottomNav currentPage="dashboard" onNavigate={onNavigate} />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    onNavigate('welcome');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header
        title="My Account"
        rightAction={
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 p-2"
          >
            <LogOutIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-900 font-bold text-xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>

        {/* Loyalty Card */}
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

        {/* Actions Grid */}
        <h3 className="font-semibold text-gray-900 mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('history')}
            className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 hover:border-gray-300 transition-colors"
          >
            <ClockIcon className="w-6 h-6 text-gray-900" />
            <span className="text-sm font-medium text-gray-700">
              Order History
            </span>
          </button>

          <button
            onClick={() => hasOrders && onNavigate('payment')}
            disabled={!hasOrders}
            className={`bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-colors ${!hasOrders ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
          >
            {hasOrders ? (
              <CreditCardIcon className="w-6 h-6 text-gray-900" />
            ) : (
              <LockIcon className="w-6 h-6 text-gray-400" />
            )}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-700">
                Payments
              </span>
              {!hasOrders && (
                <span className="text-[10px] text-gray-400 mt-1">
                  Place an order first
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => isAuthenticated && onNavigate('rewards')}
            disabled={!isAuthenticated}
            className={`bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-colors ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
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
            onClick={() => isAuthenticated && onNavigate('settings')}
            disabled={!isAuthenticated}
            className={`bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2 transition-colors ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'}`}
          >
            {isAuthenticated ? (
              <SettingsIcon className="w-6 h-6 text-gray-900" />
            ) : (
              <LockIcon className="w-6 h-6 text-gray-400" />
            )}
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-gray-700">
                Settings
              </span>
              {!isAuthenticated && (
                <span className="text-[10px] text-gray-400 mt-1">
                  Login Required
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      <BottomNav currentPage="dashboard" onNavigate={onNavigate} />
    </div>
  );
}
