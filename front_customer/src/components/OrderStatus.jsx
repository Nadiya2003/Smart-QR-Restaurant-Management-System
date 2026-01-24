/**
 * Order Status Component
 * Displays current order status with visual timeline
 * Status flow: Kitchen → Cooking → Serving → Finished
 */

function OrderStatus({ status = 'kitchen' }) {
  // Define status flow
  const statusSteps = ['Kitchen', 'Cooking', 'Serving', 'Finished'];
  const currentStepIndex = statusSteps.map(s => s.toLowerCase()).indexOf(status);

  // Status colors
  const getStatusColor = (step) => {
    const stepIndex = statusSteps.map(s => s.toLowerCase()).indexOf(step.toLowerCase());
    if (stepIndex < currentStepIndex) return 'bg-green-500';
    if (stepIndex === currentStepIndex) return 'bg-gold-500 animate-pulse';
    return 'bg-gray-600';
  };

  return (
    <div className="flex items-center justify-between gap-2 p-4 bg-white/5 rounded-lg">
      {statusSteps.map((step, index) => (
        <div key={step} className="flex items-center flex-1">
          {/* Status Circle */}
          <div className={`w-10 h-10 rounded-full ${getStatusColor(step)} flex items-center justify-center text-white font-bold transition-smooth`}>
            {index < currentStepIndex ? '✓' : index + 1}
          </div>

          {/* Connecting Line */}
          {index < statusSteps.length - 1 && (
            <div className={`flex-1 h-1 mx-2 ${
              index < currentStepIndex ? 'bg-green-500' : 'bg-gray-600'
            } transition-smooth`}></div>
          )}
        </div>
      ))}

      {/* Status Label */}
      <div className="text-right">
        <p className="text-xs text-gray-400">Status</p>
        <p className="text-sm font-bold text-gold-500 capitalize">{status}</p>
      </div>
    </div>
  );
}

export default OrderStatus;
