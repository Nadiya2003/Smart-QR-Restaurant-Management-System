import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OrderStatusTracker } from '../components/order/OrderStatusTracker';
import { Button } from '../components/ui/Button';
import { ClockIcon, XCircleIcon, CheckCircleIcon } from 'lucide-react';
import { useOrder } from '../hooks/useOrder';


export function OrderTrackingPage({ onNavigate }) {
  const { currentOrder, requestOrderCancellation } = useOrder();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelComment, setCancelComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);


  // Cancellation reasons
  const reasons = [
    "Changed my mind",
    "Wrong order",
    "Delay",
    "Other"
  ];

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="Active Order" onNavigate={onNavigate} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
             <ClockIcon className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Active Order
          </h2>
          <p className="text-gray-500 mb-8">
            You don't have any orders currently in progress.
          </p>
          <Button onClick={() => onNavigate('menu')}>View Menu</Button>
        </div>
        <BottomNav currentPage="tracking" onNavigate={onNavigate} />
      </div>
    );
  }

  const handleFullOrderCancel = () => {
    setCancelModalOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelReason) return;
    
    setLoading(true);
    try {
      const finalReason = cancelReason === 'Other' ? `Other: ${cancelComment}` : cancelReason;
      await requestOrderCancellation(finalReason);
      setCancelModalOpen(false);
      setCancelReason('');
      setCancelComment('');
      setCancelSuccess(true); // Show inline success card
    } catch (err) {
      alert('Failed to submit cancellation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if cancellation is allowed (Requirement 9: ONLY BEFORE Preparing)
  const canCancel = ['PENDING', 'ORDER PLACED', 'RECEIVED'].includes(currentOrder.status?.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header 
        title={`Order #${currentOrder.id}`} 
        showBack 
        onBack={() => onNavigate('dashboard')} 
        onNavigate={onNavigate} 
      />

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mb-2">
          <OrderStatusTracker currentStatus={currentOrder.status} />

          {/* ---- Cancellation SUCCESS banner ---- */}
          {cancelSuccess && (
            <div className="mx-4 my-3 bg-green-50 border border-green-200 rounded-2xl p-5 text-center animate-fade-in">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-green-800 text-lg mb-1">Request Submitted!</h3>
              <p className="text-green-700 text-sm mb-4">
                Your cancellation request for <strong>Order #{currentOrder.id}</strong> has been sent.<br />
                Your steward has been notified and will process it shortly.
              </p>
              <button
                onClick={() => onNavigate('menu')}
                className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-green-600 transition-colors"
              >
                Return to Menu
              </button>
            </div>
          )}

          {!cancelSuccess && currentOrder.cancellation_status === 'PENDING' && (
            <div className="bg-orange-50 p-3 text-orange-700 text-sm border-y border-orange-100 text-center animate-pulse">
              ⏳ Cancellation request is pending approval by manager.
            </div>
          )}
        </div>

        <div className="bg-white p-4 border-y border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Order Details</h3>
            <span className="text-sm text-gray-500">
              Table {currentOrder.tableNumber}
            </span>
          </div>

          <div className="space-y-3">
            {currentOrder.items.map((item, idx) => (
              <div
                key={`${item.menuItem?.id || item.id}-${idx}`}
                className="flex justify-between items-start"
              >
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">
                    {item.quantity}x
                  </span>
                  <div>
                    <p className="text-gray-900">{item.menuItem?.name || item.name}</p>
                  </div>
                </div>
                <span className="font-medium text-gray-900">
                  Rs. {((item.menuItem?.price || item.price || 0) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>Rs. {(currentOrder.items.reduce((sum, item) => sum + (item.menuItem?.price || item.price || 0) * item.quantity, 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Service Charge (10%)</span>
              <span>Rs. {(currentOrder.items.reduce((sum, item) => sum + (item.menuItem?.price || item.price || 0) * item.quantity, 0) * 0.1).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (5%)</span>
              <span>Rs. {(currentOrder.items.reduce((sum, item) => sum + (item.menuItem?.price || item.price || 0) * item.quantity, 0) * 0.05).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900 text-lg">
                Rs. {currentOrder.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {canCancel && (
            <Button
              variant="outline"
              fullWidth
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={handleFullOrderCancel}
              disabled={currentOrder.cancellation_status === 'PENDING'}
            >
              Cancel Entire Order
            </Button>
          )}

          {!['SERVED', 'COMPLETED', 'CANCELLED'].includes(currentOrder.status?.toUpperCase()) && (
            <Button
              variant="outline"
              fullWidth
              onClick={() => onNavigate('menu')}
            >
              Add More Items
            </Button>
          )}

          {['SERVED', 'READY'].includes(currentOrder.status?.toUpperCase()) && (
            <Button fullWidth onClick={() => onNavigate('payment')}>
              Proceed to Payment
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Modal (Item 10) */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Cancel Order?
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              We'll notify the kitchen to stop your order. Please let us know why.
            </p>

            <div className="space-y-4 mb-8">
               <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                     Reason for cancellation
                  </label>
                  <select
                     value={cancelReason}
                     onChange={(e) => setCancelReason(e.target.value)}
                     className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-amber-500 appearance-none shadow-inner"
                  >
                     <option value="" disabled>Select a reason</option>
                     {reasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                     ))}
                  </select>
               </div>

               {cancelReason === 'Other' && (
                  <textarea
                     value={cancelComment}
                     onChange={(e) => setCancelComment(e.target.value)}
                     placeholder="Please specify..."
                     className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500 shadow-inner"
                     rows={3}
                  />
               )}
            </div>

            <div className="flex flex-col gap-3">
               <Button
                 fullWidth
                 className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200"
                 onClick={submitCancel}
                 disabled={!cancelReason || (cancelReason === 'Other' && !cancelComment.trim()) || loading}
               >
                 {loading ? 'Processing...' : 'Request Cancellation'}
               </Button>
               <Button
                 variant="ghost"
                 fullWidth
                 className="text-gray-400 font-bold"
                 onClick={() => {
                   setCancelModalOpen(false);
                   setCancelReason('');
                   setCancelComment('');
                 }}
               >
                 Nevermind
               </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav currentPage="tracking" onNavigate={onNavigate} />
    </div>
  );
}
