import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { StewardCard } from '../components/steward/StewardCard';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';
import { api } from '../utils/api';

export function StewardSelectionPage({
  onNavigate
}) {
  const { selectedStewardId, setSteward } = useOrder();
  const [localSelectedId, setLocalSelectedId] = useState(
    selectedStewardId
  );
  const [stewards, setStewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStewards();
  }, []);

  const fetchStewards = async () => {
    try {
      setLoading(true);
      const data = await api.get('/stewards');
      setStewards(data.stewards || data);
    } catch (error) {
      console.error('Failed to fetch stewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (localSelectedId) {
      setSteward(localSelectedId);
      onNavigate('menu');
    }
  };

  const handleRandom = () => {
    const available = stewards.filter((s) => s.isAvailable);
    if (available.length > 0) {
      const randomSteward =
        available[Math.floor(Math.random() * available.length)];
      setLocalSelectedId(randomSteward.id);
      setSteward(randomSteward.id);
      onNavigate('menu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header
        title="Select Your Steward"
        showBack
        onBack={() => onNavigate('welcome')}
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

        <p className="text-gray-600 mb-6 text-center text-sm">
          Choose a steward to assist you during your meal, or let us pick one for you.
        </p>

        <div className="space-y-3 mb-8">
          {stewards.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-dashed border-gray-200">
              <p className="text-gray-500">No stewards are currently on duty. You can still order and our team will assist you!</p>
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

        <Button variant="secondary" fullWidth onClick={handleRandom}>
          Choose Random Steward
        </Button>
      </div>

      <div className="fixed bottom-0 w-full max-w-md bg-white p-4 border-t border-gray-100 pb-safe">
        <Button
          fullWidth
          size="lg"
          disabled={!localSelectedId}
          onClick={handleContinue}
        >
          Continue to Menu
        </Button>
      </div>
    </div>
  );
}

