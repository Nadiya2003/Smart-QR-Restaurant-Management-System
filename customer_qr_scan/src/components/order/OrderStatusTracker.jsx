import React from 'react';
import {
  CheckIcon,
  ClockIcon,
  ChefHatIcon,
  BellIcon,
  UtensilsIcon,
  CheckCircleIcon
} from 'lucide-react';

export function OrderStatusTracker({ currentOrder }) {
  const currentStatus = currentOrder?.main_status || currentOrder?.status || 'PENDING';
  const kitchenStatus = currentOrder?.kitchen_status;
  const barStatus = currentOrder?.bar_status;

  const steps = [
    { id: 'PLACED', label: 'Order Received', icon: ClockIcon },
    { id: 'CONFIRMED', label: 'Order Confirmed', icon: CheckIcon },
    { id: 'PREPARING', label: 'Preparing', icon: ChefHatIcon },
    { id: 'READY_TO_SERVE', label: 'Ready to Serve', icon: BellIcon },
    { id: 'SERVED', label: 'Served', icon: UtensilsIcon },
    { id: 'COMPLETED', label: 'Completed', icon: CheckCircleIcon }
  ];

  // Helper for tracking index (Treat COMPLETED/FINISHED as absolute terminal end)
  let normalizedStatus = currentStatus?.toUpperCase() || 'PLACED';
  if (normalizedStatus === 'PENDING') normalizedStatus = 'PLACED';
  if (normalizedStatus === 'READY') normalizedStatus = 'READY_TO_SERVE';
  
  const statusIndex = steps.findIndex((s) => s.id === normalizedStatus);
  const isAllDone = currentStatus?.toUpperCase() === 'COMPLETED' || currentStatus?.toUpperCase() === 'FINISHED';

  return (
    <div className="py-6 px-4">
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200"></div>

        {/* Active Line Fill */}
        <div
          className="absolute left-6 top-6 w-0.5 bg-gray-900 transition-all duration-500"
          style={{
            height: isAllDone ? '100%' : `${statusIndex >= 0 ? (statusIndex / (steps.length - 1)) * 100 : 0}%`
          }}
        ></div>

        <div className="space-y-8 relative">
          {steps.map((step, index) => {
            const isCompleted = isAllDone || (statusIndex >= 0 && index <= statusIndex);
            const isCurrent = statusIndex >= 0 && index === statusIndex;
            const isNext = !isAllDone && statusIndex >= 0 && index === statusIndex + 1;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-4 group">
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
                    {isCurrent && (
                      <p className="text-sm text-gray-600 font-medium mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                        {step.id === 'READY_TO_SERVE' ? 'Your order is ready' : step.id === 'SERVED' ? 'Order served. Enjoy your meal!' : 'Currently in progress...'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sub-status Split Handling (Requirement #3) */}
                {step.id === 'PREPARING' && isCurrent && (
                  <div className="ml-16 flex flex-wrap gap-2 mt-1">
                    {/* Food Status */}
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      kitchenStatus === 'ready' 
                        ? 'bg-green-100 text-green-700' 
                        : kitchenStatus === 'preparing' 
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {kitchenStatus === 'ready' ? '✔' : kitchenStatus === 'preparing' ? '⏳' : '•'} 
                      Food {kitchenStatus === 'ready' ? 'Ready' : kitchenStatus === 'preparing' ? 'Preparing' : 'Pending'}
                    </div>

                    {/* Drink Status */}
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      barStatus === 'ready' 
                        ? 'bg-blue-100 text-blue-700' 
                        : barStatus === 'preparing' 
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {barStatus === 'ready' ? '✔' : barStatus === 'preparing' ? '⏳' : '•'} 
                      Beverages {barStatus === 'ready' ? 'Ready' : barStatus === 'preparing' ? 'Preparing' : 'Pending'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
