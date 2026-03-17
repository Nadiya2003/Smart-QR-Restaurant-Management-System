import React from 'react';
import { UtensilsIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';

export function WelcomePage({ onNavigate }) {
  const { tableNumber } = useOrder();
  
  // Use the local image from the public folder
  const restaurantImage = '/welcome-bg.png';
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero Section with Image */}
      <div className="relative h-[45vh] w-full overflow-hidden">
        <img 
          src={restaurantImage} 
          alt="Melissa's Food Court" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Melissa's <span className="text-amber-400">Food Court</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-black px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
              Smart QR Dining
            </span>
            <span className="text-white/80 text-sm font-medium">
              Table {tableNumber}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col -mt-6 bg-white rounded-t-[32px] relative z-10 shadow-[0_-12px_30px_rgba(0,0,0,0.05)]">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8"></div>
        
        <p className="text-gray-600 mb-10 text-lg">
          Experience the finest Sri Lankan hospitality and cuisine with our seamless smart ordering system.
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={() => onNavigate('steward')}
            className="w-full bg-gray-900 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-between group hover:bg-gray-800 transition-all active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              <UtensilsIcon className="w-5 h-5 text-amber-400" />
              Continue as Guest
            </span>
            <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('login')}
            className="w-full py-4 px-4 rounded-2xl font-bold text-gray-900 border-2 border-gray-100 hover:border-gray-900 transition-all active:scale-[0.95]"
          >
            Login
          </button>
        </div>
        
        <div className="mt-auto pt-8 text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-[2px]">
            Authentic Properties Pvt (Ltd)
          </p>
        </div>
      </div>
    </div>
  );
}


