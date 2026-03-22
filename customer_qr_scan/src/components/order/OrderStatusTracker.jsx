import React from 'react';
import {
  CheckIcon,
  ClockIcon,
  ChefHatIcon,
  BellIcon,
  UtensilsIcon
} from 'lucide-react';

export function OrderStatusTracker({ currentStatus }) {
  const steps = [
    { id: 'PENDING', label: 'Order Received', icon: ClockIcon },
    { id: 'CONFIRMED', label: 'Confirmed', icon: CheckIcon },
    { id: 'PREPARING', label: 'Preparing', icon: ChefHatIcon },
    { id: 'READY', label: 'Ready to Serve', icon: BellIcon },
    { id: 'SERVED', label: 'Served', icon: UtensilsIcon }
  ];

  const statusIndex = steps.findIndex((s) => s.id === (currentStatus?.toUpperCase() || 'PENDING'));
  const isAllDone = currentStatus?.toUpperCase() === 'SERVED' || currentStatus?.toUpperCase() === 'COMPLETED';

  return (
    <div className="py-6 px-4">
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200"></div>

        {/* Active Line Fill */}
        <div
          className="absolute left-6 top-6 w-0.5 bg-gray-900 transition-all duration-500"
          style={{
            height: isAllDone ? '100%' : `${(statusIndex / (steps.length - 1)) * 100}%`
          }}
        ></div>

        <div className="space-y-8 relative">
          {steps.map((step, index) => {
            const isCompleted = isAllDone || index <= statusIndex;
            const isNext = !isAllDone && index === statusIndex + 1;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center gap-4 group">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all ${
                    isCompleted
                      ? 'bg-black text-white'
                      : isNext
                      ? 'bg-gray-100 text-gray-900 ring-4 ring-gray-100 animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-semibold text-lg ${
                        isCompleted || isNext ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {isCompleted && (
                      <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                         <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  {isNext && (
                    <p className="text-sm text-gray-600 font-medium mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                      Currently in progress...
                    </p>
                  )}
                </div>

                {/* Optional "In progress" between steps label logic can go here if needed, 
                    but the pulse effect on the NEXT step is usually what's meant by "middle" 
                    in terms of flow. */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
