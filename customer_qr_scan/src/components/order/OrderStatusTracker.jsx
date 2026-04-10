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

  // 1. Check for item types
  const hasFood = currentOrder?.items?.some(i => {
      const cat = (i.category || i.menuItem?.category?.name || i.category_name || '').toLowerCase();
      return !cat.includes('beverage') && !cat.includes('bar');
  }) ?? false;

  const hasBeverage = currentOrder?.items?.some(i => {
      const cat = (i.category || i.menuItem?.category?.name || i.category_name || '').toLowerCase();
      return cat.includes('beverage') || cat.includes('bar');
  }) ?? false;

  // 2. Normalize Status
  let normalizedStatus = currentStatus?.toUpperCase() || 'PLACED';
  if (normalizedStatus === 'PENDING') normalizedStatus = 'PLACED';
  if (normalizedStatus === 'READY') normalizedStatus = 'READY_TO_SERVE';
  
  let statusIndex = steps.findIndex((s) => s.id === normalizedStatus);

  // 3. Dynamic Override for Preparing/Ready logic (The User's specific rule map)
  const isFoodPreparing = ['preparing', 'ready'].includes((kitchenStatus || '').toLowerCase());
  const isBevPreparing = ['preparing', 'ready'].includes((barStatus || '').toLowerCase());
  
  const isFoodReady = (kitchenStatus || '').toLowerCase() === 'ready';
  const isBevReady = (barStatus || '').toLowerCase() === 'ready';

  const bothPreparingSatisfied = 
      (hasFood && hasBeverage && isFoodPreparing && isBevPreparing) ||
      (hasFood && !hasBeverage && isFoodPreparing) ||
      (!hasFood && hasBeverage && isBevPreparing);

  const bothReadySatisfied = 
      (hasFood && hasBeverage && isFoodReady && isBevReady) ||
      (hasFood && !hasBeverage && isFoodReady) ||
      (!hasFood && hasBeverage && isBevReady);

  // If the backend has reached at least PREPARING, manually control the UI visual progression based on item statuses
  if (statusIndex >= 2 && statusIndex < 4) {
      if (bothReadySatisfied) {
          statusIndex = 4; // Ticks "Ready to Serve", moves to SERVED active step
      } else if (bothPreparingSatisfied) {
          statusIndex = 3; // Ticks "Preparing", moves to READY_TO_SERVE active step
      } else {
          statusIndex = 2; // PREPARING is active
      }
  }

  const isAllDone = ['COMPLETED', 'FINISHED'].includes(currentStatus?.toUpperCase());
  if (isAllDone) statusIndex = steps.length - 1;

  return (
    <div className="py-6 px-4">
      <div className="relative">
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200"></div>

        <div
          className="absolute left-6 top-6 w-0.5 bg-gray-900 transition-all duration-500"
          style={{
            height: isAllDone ? '100%' : `${statusIndex >= 0 ? (statusIndex / (steps.length - 1)) * 100 : 0}%`
          }}
        ></div>

        <div className="space-y-8 relative">
          {steps.map((step, index) => {
            const isCompleted = isAllDone || (statusIndex >= 0 && index < statusIndex);
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
                        {step.id === 'READY_TO_SERVE' ? 'Food is ready, awaiting service' : 
                         step.id === 'SERVED' ? 'Order served. Enjoy your meal!' : 
                         'Currently in progress...'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sub-status Sub-sections */}
                {step.id === 'PREPARING' && (isCurrent || isCompleted) && (
                  <div className="ml-16 flex flex-col gap-2 mt-1">
                    {/* Food Status */}
                    {!hasFood ? (
                      <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-gray-100 text-gray-400 self-start">
                        • No food items in this order
                      </div>
                    ) : (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start ${
                        isFoodReady
                          ? 'bg-green-100 text-green-700' 
                          : isFoodPreparing
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isFoodReady || isFoodPreparing ? '✔' : '•'} 
                        Food Section: {isFoodReady ? 'Ready' : isFoodPreparing ? 'Preparing' : 'Pending'}
                      </div>
                    )}

                    {/* Drink Status */}
                    {!hasBeverage ? (
                      <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-gray-100 text-gray-400 self-start">
                        • No beverages in this order
                      </div>
                    ) : (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start ${
                        isBevReady
                          ? 'bg-blue-100 text-blue-700' 
                          : isBevPreparing
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isBevReady || isBevPreparing ? '✔' : '•'} 
                        Beverage Section: {isBevReady ? 'Ready' : isBevPreparing ? 'Preparing' : 'Pending'}
                      </div>
                    )}

                    {/* New Items Status (Requirement) */}
                    {(statusIndex >= 2 && currentOrder?.items?.some(i => (i.item_status || 'PENDING').toUpperCase() === 'PENDING')) && (
                      <div className="px-3 py-1 mt-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-amber-50 text-amber-600 self-start border border-amber-200">
                        • New Items – Waiting to Prepare
                      </div>
                    )}
                    {(statusIndex >= 2 && 
                      currentOrder?.items?.some(i => (i.item_status || '').toUpperCase() === 'READY') && 
                      currentOrder?.items?.some(i => (i.item_status || '').toUpperCase() === 'PREPARING')) && (
                      <div className="px-3 py-1 mt-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-green-50 text-green-700 self-start border border-green-200">
                        ✔ New items preparing
                      </div>
                    )}
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
