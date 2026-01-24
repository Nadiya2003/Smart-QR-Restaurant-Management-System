

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import StewardCard from '../components/StewardCard';
import Button from '../components/Button';

function StewardSelect() {
  const navigate = useNavigate();

  // Static steward data with 6 Sri Lankan names
  const [stewards] = useState([
    {
      id: 1,
      name: 'Kasun',
      avatar: '👨‍💼',
      rating: 5,
      activeOrders: 2,
      status: 'active', // 🟢 Active - can be selected
    },
    {
      id: 2,
      name: 'Nimal',
      avatar: '👨‍💼',
      rating: 4,
      activeOrders: 5,
      status: 'busy', // 🟡 Has max 5 orders - BUSY, selection disabled
    },
    {
      id: 3,
      name: 'Saman',
      avatar: '👨‍💼',
      rating: 4,
      activeOrders: 3,
      status: 'active', // 🟢 Active - can be selected
    },
    {
      id: 4,
      name: 'Dilani',
      avatar: '👩‍💼',
      rating: 5,
      activeOrders: 1,
      status: 'active', // 🟢 Active - can be selected
    },
    {
      id: 5,
      name: 'Tharindu',
      avatar: '👨‍💼',
      rating: 3,
      activeOrders: 0,
      status: 'inactive', // 🔴 Inactive - selection disabled
    },
    {
      id: 6,
      name: 'Isuru',
      avatar: '👨‍💼',
      rating: 4,
      activeOrders: 2,
      status: 'active', // 🟢 Active - can be selected
    },
  ]);

  const [selectedStewardId, setSelectedStewardId] = useState(null);

  // Handle steward selection
  const handleSelectSteward = (stewardId) => {
    const selected = stewards.find((s) => s.id === stewardId);

    // Only allow selection if steward is ACTIVE and not BUSY
    if (selected.status === 'active' && selected.activeOrders < 5) {
      setSelectedStewardId(stewardId);
    }
  };

  // Handle proceed button
  const handleProceed = () => {
    if (selectedStewardId) {
      const selected = stewards.find((s) => s.id === selectedStewardId);

      // Save selected steward to localStorage
      localStorage.setItem('selectedSteward', JSON.stringify(selected));

      // Redirect to menu
      navigate('/customer/menu');
    }
  };

  const selectedSteward = stewards.find((s) => s.id === selectedStewardId);

  return (
    <div className="min-h-screen bg-dark-gradient px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Select Your Steward</h1>
          <p className="text-gray-400 text-lg">
            Choose an active steward to serve your order
          </p>
        </div>

        {/* Steward Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {stewards.map((steward) => (
            <StewardCard
              key={steward.id}
              steward={steward}
              isSelected={selectedStewardId === steward.id}
              onSelect={handleSelectSteward}
              canSelect={true}
            />
          ))}
        </div>

        {/* Selected Steward Info & Proceed */}
        {selectedSteward && (
          <GlassCard className="max-w-2xl mx-auto mb-8">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold">
                You selected <span className="text-gold-500">{selectedSteward.name}</span>
              </h2>
              <p className="text-gray-400">
                {selectedSteward.name} is ready to serve you. Click proceed to continue.
              </p>
              <Button onClick={handleProceed} className="w-full md:w-auto px-12">
                Proceed to Menu
              </Button>
            </div>
          </GlassCard>
        )}

        {/* Info Box */}
        <div className="max-w-2xl mx-auto bg-gold-500/5 border border-gold-500/20 rounded-lg p-4 text-sm text-gray-300">
          <p>
            <span className="text-gold-500 font-semibold">ℹ️ Note:</span> You can only select stewards with an
            active status and available capacity (less than 5 orders).
          </p>
        </div>
      </div>
    </div>
  );
}

export default StewardSelect;
