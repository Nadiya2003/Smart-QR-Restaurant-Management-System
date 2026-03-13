import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import GlassCard from '../components/GlassCard';
import StewardCard from '../components/StewardCard';
import Button from '../components/Button';

function StewardSelect() {
  const navigate = useNavigate();
  const { refreshAuth } = useCustomer();

  const [stewards, setStewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStewardId, setSelectedStewardId] = useState(null);
  const [showNoStewardModal, setShowNoStewardModal] = useState(false);

  // Fetch stewards from API
  useEffect(() => {
    fetch('http://192.168.1.3:5000/api/stewards')
      .then(res => res.json())
      .then(data => {
        if (data.stewards && data.stewards.length > 0) {
          setStewards(data.stewards);
          setShowNoStewardModal(false);
        } else {
          setStewards([]);
          setShowNoStewardModal(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stewards', err);
        setLoading(false);
        setShowNoStewardModal(true);
      });
  }, []);

  // Handle steward selection
  const handleSelectSteward = (stewardId) => {
    const selected = stewards.find((s) => s.id === stewardId);
    // Only allow selection if steward is ACTIVE and not BUSY
    if (selected && selected.status === 'active' && (selected.activeOrders || 0) < 5) {
      setSelectedStewardId(stewardId);
    }
  };

  // Handle proceed button
  const handleProceed = () => {
    if (selectedStewardId) {
      const selected = stewards.find((s) => s.id === selectedStewardId);
      // Save selected steward to localStorage
      localStorage.setItem('selectedSteward', JSON.stringify(selected));
      refreshAuth();
      // Redirect to menu category
      navigate('/customer/menu-category');
    }
  };

  const selectedSteward = stewards.find((s) => s.id === selectedStewardId);

  return (
    <div className="min-h-screen bg-dark-gradient px-4 py-12 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-block px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs font-black uppercase tracking-[.3em] mb-6">
            Hospitality Selection
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-gold-200 to-white bg-clip-text text-transparent tracking-tighter">
            Select Your Steward
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium">
            Personalized service begins with your choice of our dedicated hospitality experts.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin"></div>
            <p className="mt-6 text-gray-500 font-bold uppercase tracking-widest text-sm">Discovering available stewards...</p>
          </div>
        ) : (
          <>
            {/* Steward Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20 animate-slide-up">
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
              <GlassCard className="max-w-2xl mx-auto mb-20 p-10 border-gold-500/30 animate-scale-up shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="text-center space-y-8">
                  <div className="w-24 h-24 mx-auto rounded-full border-4 border-gold-500 p-1 shadow-[0_0_30px_rgba(212,175,55,0.3)] overflow-hidden">
                    <img
                      src={selectedSteward.avatar && (selectedSteward.avatar.includes('.png') || selectedSteward.avatar.includes('.jpg')) ?
                        selectedSteward.avatar : '/stewards/default.png'}
                      className="w-full h-full rounded-full object-cover"
                      alt=""
                    />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white px-2">
                      <span className="text-gold-500">{selectedSteward.name}</span> is Ready
                    </h2>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                      Hand-selected for your dining experience
                    </p>
                  </div>
                  <Button onClick={handleProceed} size="lg" className="w-full md:w-auto px-20 py-5 text-xl font-black uppercase tracking-tighter shadow-2xl">
                    Proceed to Menu
                  </Button>
                </div>
              </GlassCard>
            )}

            {!selectedSteward && stewards.length > 0 && (
              <div className="text-center animate-pulse opacity-30">
                <p className="text-gold-500 font-black uppercase tracking-[.4em] text-xs">Waiting for your selection</p>
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-8 flex items-start gap-6 group hover:bg-white/5 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center flex-shrink-0 border border-gold-500/20">
              <svg className="w-6 h-6 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2 group-hover:text-gold-500 transition-colors">Integrated Service Model</h4>
              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Your selected steward remains your primary point of contact from kitchen coordination to final billing, ensuring a seamless and high-touch hospitality experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* No Steward Modal */}
      {showNoStewardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <GlassCard className="max-w-md w-full p-12 text-center border-red-500/30 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-4xl font-black mb-4 text-white uppercase tracking-tighter">Full Capacity</h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">
              Our hospitality team is currently at full capacity. Please allow us a moment to reassign staff for your service.
            </p>
            <div className="space-y-4">
              <Button onClick={() => window.location.reload()} variant="primary" className="w-full py-4 font-black">
                Reload Stewards
              </Button>
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-[.3em]">
                System Check in Progress
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default StewardSelect;
