import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useOrder } from '../hooks/useOrder';
import { api } from '../utils/api';

export function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { currentOrder, tableNumber } = useOrder();
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);

      // --- SYNC GUEST ORDER IF APPLICABLE ---
      if (tableNumber) {
        try {
          await api.post('/orders/sync-guest', { tableNumber });
        } catch (syncErr) {
          console.error('Failed to sync guest order:', syncErr);
        }
      }

      // Immediately check the server for any active order within the last 6 hours
      // (handles case where user logged out mid-session and returns)
      try {
        const token = loggedInUser?.token || localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${API_URL}/api/orders/customer`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const orders = data.orders || [];

        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        const activeOrder = orders.find(o => {
          const isActive = !['COMPLETED', 'CANCELLED', 'FINISHED'].includes(o.status?.toUpperCase());
          const isDineIn = o.type === 'DINE-IN' || o.order_type === 'registered' || o.order_type === 'guest';
          const isRecent = new Date(o.created_at).getTime() > sixHoursAgo;
          return isActive && isDineIn && isRecent;
        });

        if (activeOrder) {
          localStorage.setItem('activeOrderId', activeOrder.id.toString());
          if (activeOrder.table_number) {
            localStorage.setItem('activeTable', activeOrder.table_number.toString());
          }
          onNavigate('dashboard'); // WelcomePage will redirect to tracking via existing logic
          return;
        }
      } catch (_) {
        // Ignore — fallback to standard flow below
      }

      // No active order: send through normal flow
      onNavigate('steward');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        title="Welcome Back"
        showBack
        onBack={() => onNavigate('auth-selection')}
        onNavigate={onNavigate}
      />

      <div className="flex-1 p-6 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Login</h2>
          <p className="text-gray-500 mt-2">
            Enter your details to access your account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                className="text-sm text-gray-900 font-medium"
              >
                Forgot?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-4">
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-gray-900 font-semibold hover:underline"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
