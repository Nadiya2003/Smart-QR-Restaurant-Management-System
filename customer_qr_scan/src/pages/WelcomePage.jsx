import React, { useState, useEffect } from 'react';
import { UtensilsIcon, ChevronRightIcon, SparklesIcon, ClockIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';
import { useAuth } from '../hooks/useAuth';

export function WelcomePage({ onNavigate }) {
  const { currentOrder, clearOrder, isInitialLoading } = useOrder();
  const { isAuthenticated, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const restaurantImage = '/2.jpg';

  useEffect(() => {
    if (loading || isInitialLoading) return;

    // Smart Redirection & Session Detection (Requirement 9 & 11)
    const isOngoing = currentOrder && !['COMPLETED', 'CANCELLED'].includes(currentOrder.status?.toUpperCase());

    if (isAuthenticated && isOngoing) {
       onNavigate('dashboard');
       return;
    }

    if (!isAuthenticated && isOngoing) {
       // Guest with active session detected - ask to continue (Requirement 9)
       setShowSessionPopup(true);
       return;
    }

    // Default: Show landing modal after delay
    const timer = setTimeout(() => setShowModal(true), 1200);
    return () => clearTimeout(timer);
  }, [currentOrder, isAuthenticated, onNavigate, loading, isInitialLoading]);

  const handleStartFresh = () => {
    clearOrder(false); // Only clear locally, don't kill session in DB
    setShowSessionPopup(false);
    setShowModal(true);
  };

  const handleContinueSession = () => {
    setShowSessionPopup(false);
    // If this session belongs to a registered customer but we aren't logged in,
    // force login portal to restore the state accurately.
    if (currentOrder?.customer_id && !isAuthenticated) {
      onNavigate('login');
    } else {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Background/Hero Section */}
      <div className="absolute inset-0 z-0">
        <img
          src={restaurantImage}
          alt="Melissa&apos;s Food Court"
          className="w-full h-full object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col p-8 justify-center items-center text-center">
        <div className="w-24 h-24 bg-amber-500 rounded-[32px] flex items-center justify-center mb-8 rotate-12 shadow-2xl">
          <UtensilsIcon className="w-12 h-12 text-white -rotate-12" />
        </div>

        <h1 className="text-5xl font-black text-white mb-4 tracking-tight leading-none uppercase">
          Melissa&apos;s <br />
          <span className="text-amber-400">Food Court</span>
        </h1>

        <p className="text-white/70 text-lg font-medium max-w-[280px] mb-12">
          The finest Sri Lankan hospitality and cuisine at your fingertips.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs opacity-0 animate-fade-up">
          <Button onClick={() => setShowModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-5 rounded-3xl h-auto">
            Get Started
          </Button>
        </div>
      </div>

      {/* Modern Welcome Popup Modal */}
      {showModal && !showSessionPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden relative z-[60] shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-modal-in">
            <div className="h-48 relative overflow-hidden">
              <img
                src={restaurantImage}
                alt="Welcome"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
              <div className="absolute bottom-4 left-8 right-8">
                <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[2px] mb-2 inline-block">
                  Welcome Experience
                </span>
              </div>
            </div>

            <div className="p-8 pt-2">
              <p className="text-gray-500 mb-8 text-md leading-relaxed">
                Welcome to Sri Lanka&apos;s finest. Please select your table to explore our menu and place your order.
              </p>

              <button
                onClick={() => onNavigate('auth-selection')}
                className="w-full bg-gray-900 text-white py-5 px-6 rounded-3xl font-bold flex items-center justify-between group hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl shadow-gray-900/10"
              >
                <span className="flex items-center gap-3">
                  <SparklesIcon className="w-5 h-5 text-amber-400 fill-amber-400" />
                  Explore Experience
                </span>
                <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Recovery Popup (Requirement 9) */}
      {showSessionPopup && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-500 text-center">
               <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClockIcon className="w-10 h-10" />
               </div>
               
               <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
                  Welcome back!
               </h3>
               <p className="text-gray-500 text-sm mb-10 leading-relaxed px-2">
                  We found your previous order for <b>Table {currentOrder?.tableNumber || currentOrder?.table_id}</b>. Would you like to continue?
               </p>

               <div className="flex flex-col gap-4">
                  <Button
                    fullWidth
                    className="bg-amber-500 hover:bg-amber-600 text-white py-5 rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-amber-200"
                    onClick={handleContinueSession}
                  >
                    Continue with Previous Order
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="text-gray-400 font-bold hover:text-red-500 transition-colors"
                    onClick={handleStartFresh}
                  >
                    Start as New Order
                  </Button>
               </div>
            </div>
         </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.8s forwards 0.5s;
        }
        .animate-modal-in {
          animation: modal-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}} />
    </div>
  );
}
