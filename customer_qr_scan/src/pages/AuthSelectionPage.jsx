import React from 'react';
import { UtensilsIcon, ChevronRightIcon, UserIcon, LogInIcon, ArrowLeftIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';

export function AuthSelectionPage({ onNavigate }) {
  const { tableNumber } = useOrder();

  return (
    <div className="min-h-screen flex flex-col bg-amber-500">
      <div className="p-8 flex items-center justify-between">
         <button onClick={() => onNavigate('table-selection')} className="text-white hover:bg-white/10 p-2 rounded-full transition-all">
            <ArrowLeftIcon className="w-6 h-6" />
         </button>
         <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white font-bold text-sm tracking-wide">
            Table {tableNumber}
         </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 pb-10">
         <div className="bg-white/10 backdrop-blur-lg w-20 h-20 rounded-3xl flex items-center justify-center mb-10 shadow-xl border border-white/20">
            <UtensilsIcon className="w-10 h-10 text-white" />
         </div>
         
         <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            How would you like <br />
            <span className="text-white/80">to proceed?</span>
         </h1>
         
         <p className="text-white/80 text-lg mb-12">
            Login to earn loyalty points and view your order history, or continue as a guest.
         </p>

         <div className="space-y-4">
            <button
               onClick={() => onNavigate('login')}
               className="w-full bg-white text-amber-600 py-5 px-8 rounded-3xl font-bold flex items-center justify-between shadow-2xl shadow-amber-900/10 hover:shadow-none transition-all active:scale-[0.98]"
            >
               <span className="flex items-center gap-4">
                  <div className="bg-amber-100 p-2 rounded-xl">
                    <LogInIcon className="w-6 h-6" />
                  </div>
                  Login
               </span>
               <ChevronRightIcon className="w-5 h-5" />
            </button>

            <button
               onClick={() => onNavigate('steward')}
               className="w-full bg-amber-600/50 backdrop-blur-md border border-white/30 text-white py-5 px-8 rounded-3xl font-bold flex items-center justify-between hover:bg-amber-600/70 transition-all active:scale-[0.98]"
            >
               <span className="flex items-center gap-4">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  Continue as Guest
               </span>
               <ChevronRightIcon className="w-5 h-5" />
            </button>
         </div>
      </div>

      <div className="p-8 text-center bg-amber-600/20">
         <p className="text-xs text-white/50 font-bold uppercase tracking-[4px]">
             melissa&apos;s food court
         </p>
      </div>
    </div>
  );
}
