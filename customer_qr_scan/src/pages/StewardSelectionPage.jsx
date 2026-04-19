import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { StewardCard } from '../components/steward/StewardCard';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';
import { api } from '../utils/api';

export function StewardSelectionPage({
  onNavigate
}) {
  const { selectedStewardId, setSteward, tableNumber } = useOrder();
  const [localSelectedId, setLocalSelectedId] = useState(
    selectedStewardId
  );
  const [stewards, setStewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStewards();
    
    // Auto-refresh every 10 seconds if no stewards are available to help "wait" for duty
    const interval = setInterval(() => {
      const activeCount = stewards.filter(s => s.status !== 'offline').length;
      if (activeCount === 0 || stewards.length === 0) {
        fetchStewards();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [stewards.length]); // Re-run effect setup if stewards data structure changes

  const fetchStewards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get('/stewards');
      setStewards(data.stewards || data);
    } catch (err) {
      console.error('Failed to fetch stewards:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (localSelectedId) {
      setSteward(localSelectedId);
      onNavigate(tableNumber ? 'menu' : 'table-selection');
    }
  };

  const handleRandom = () => {
    // Only pick from active or busy stewards — never from offline
    const pool = stewards.filter((s) => s.status !== 'offline');
    if (pool.length === 0) {
      alert('All stewards are currently off duty. Please wait or refresh.');
      return;
    }
    const randomSteward = pool[Math.floor(Math.random() * pool.length)];
    setLocalSelectedId(randomSteward.id);
    setSteward(randomSteward.id);
    onNavigate(tableNumber ? 'menu' : 'table-selection');
  };

  const StewardSkeleton = () => (
    <div className="w-full h-24 bg-white/50 rounded-xl border border-gray-100 p-4 animate-pulse mb-3">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header
        title="Select Your Steward"
        showBack
        onBack={() => onNavigate('auth-selection')}
        onNavigate={onNavigate}
      />

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Banner Section */}
        <div className="relative h-32 rounded-2xl overflow-hidden mb-6 shadow-sm bg-gradient-to-r from-gray-900 to-gray-700">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-white text-sm font-medium text-center opacity-90">
              Our dedicated staff is here to make your dining experience exceptional
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Choose a Steward</h2>
          <button 
            onClick={fetchStewards}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <svg className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Warning banner if no one is on duty */}
        {stewards.length > 0 && stewards.filter(s => s.status !== 'offline').length === 0 && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.41-1.19 2.123-1.19 2.533 0l.991 2.871a1.539 1.539 0 001.462 1.062h3.018c1.261 0 1.787 1.613.768 2.348l-2.441 1.773a1.539 1.539 0 00-.558 1.714l.991 2.871c.41 1.19-1.014 2.227-2.033 1.492l-2.441-1.773a1.539 1.539 0 00-1.714 0l-2.441 1.773c-1.019.735-2.443-.302-2.033-1.492l.991-2.871a1.539 1.539 0 00-.558-1.714l-2.441-1.773c-1.019-.735-.493-2.348.768-2.348h3.018a1.539 1.539 0 001.462-1.062l.991-2.871z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700 font-bold uppercase tracking-wider">
                  Service Warning: No Stewards Currently on Duty
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  You can see our staff below, but you must wait for a steward to check in before starting your order.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-8">
          {loading ? (
            Array(5).fill(0).map((_, i) => <StewardSkeleton key={i} />)
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center border border-dashed border-red-200">
               <svg className="w-8 h-8 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               <p className="font-medium">Failed to load stewards</p>
               <p className="text-sm mt-1 opacity-80">{error}</p>
               <p className="text-xs mt-3 text-red-500 font-semibold">Check backend IP in .env</p>
            </div>
          ) : stewards.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-dashed border-gray-200">
              <p className="text-gray-500">No stewards records found. Please contact management.</p>
            </div>
          ) : (
            stewards.map((steward) => (
                <StewardCard
                  key={steward.id}
                  steward={steward}
                  isSelected={localSelectedId === steward.id}
                  onSelect={(s) => setLocalSelectedId(s.id)}
                />
              ))
          )}
        </div>

        <Button 
          variant="secondary" 
          fullWidth 
          onClick={handleRandom}
          disabled={loading || stewards.filter(s => s.status !== 'offline').length === 0}
        >
          Pick a Random Steward
        </Button>
      </div>

      <div className="fixed bottom-0 w-full max-w-md bg-white p-4 border-t border-gray-100 pb-safe">
        <Button
          fullWidth
          size="lg"
          disabled={!localSelectedId}
          onClick={handleContinue}
        >
          Confirm Steward
        </Button>
      </div>
    </div>
  );
}

