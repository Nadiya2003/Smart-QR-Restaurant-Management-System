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

  const currentIndex = steps.findIndex((s) => s.id === currentStatus);

  return (
    <div className="py-6 px-4">
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200"></div>

        {/* Active Line Fill */}
        <div
          className="absolute left-6 top-6 w-0.5 bg-gray-900"
          style={{
            height: `${(currentIndex / (steps.length - 1)) * 100}%`
          }}
        ></div>

        <div className="space-y-8 relative">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors ${
                    isCompleted
                      ? 'bg-gray-900 text-white'
                      : isCurrent
                      ? 'bg-gray-100 text-gray-900 ring-4 ring-gray-50'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1">
                  <h4
                    className={`font-medium text-lg ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {isCurrent && (
                    <p className="text-sm text-gray-600 font-medium mt-1">
                      In progress...
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
