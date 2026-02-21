/**
 * Order Status Component
 * Displays current order status with a premium visual timeline
 */

function OrderStatus({ status = 'PENDING' }) {
  // Define status flow with display labels
  const steps = [
    { key: 'PENDING', label: 'Ordered' },
    { key: 'PREPARING', label: 'Cooking' },
    { key: 'READY', label: 'Serving' },
    { key: 'COMPLETED', label: 'Done' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === status.toUpperCase());

  const getStepStatus = (index) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-full py-6">
      <div className="relative flex justify-between">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 w-full h-[2px] bg-white/10 z-0"></div>

        {/* Progress Line Active */}
        <div
          className="absolute top-5 left-0 h-[2px] bg-gold-500 transition-all duration-1000 z-0"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const stepStatus = getStepStatus(index);
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              {/* Point */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${stepStatus === 'completed'
                    ? 'bg-gold-500 border-gold-500 text-black'
                    : stepStatus === 'current'
                      ? 'bg-black border-gold-500 text-gold-500 shadow-[0_0_15px_rgba(212,175,55,0.5)]'
                      : 'bg-black border-white/20 text-white/40'
                  }`}
              >
                {stepStatus === 'completed' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-black">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span className={`mt-3 text-[10px] uppercase font-black tracking-widest transition-colors duration-500 ${stepStatus === 'upcoming' ? 'text-white/20' : 'text-gold-500'
                }`}>
                {step.label}
              </span>

              {/* Status Pulse for current */}
              {stepStatus === 'current' && (
                <div className="absolute top-0 w-10 h-10 rounded-full bg-gold-500/20 animate-ping -z-10"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OrderStatus;
