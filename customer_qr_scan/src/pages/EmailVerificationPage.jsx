import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function EmailVerificationPage({ email, onVerified, onNavigate }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyEmail } = useAuth();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await verifyEmail(email, otp);
      onVerified();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        title="Verify Email"
        showBack
        onBack={() => onNavigate('login')}
        onNavigate={onNavigate}
        hideTable
      />

      <div className="flex-1 p-6 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Confirm Email</h2>
          <p className="text-gray-500 mt-2">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-gray-900">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              className="w-full max-w-[240px] border-b-2 border-gray-900 text-center text-4xl font-bold tracking-[0.5em] py-2 focus:outline-none"
              placeholder="000000"
              required
            />
          </div>

          <div className="pt-4">
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Didn't receive the code?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-gray-900 font-semibold hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
