import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OrderStatusTracker } from '../components/order/OrderStatusTracker';
import { Button } from '../components/ui/Button';
import { ClockIcon, XCircleIcon, CheckCircleIcon, ClipboardListIcon } from 'lucide-react';
import { useOrder } from '../hooks/useOrder';


export function OrderTrackingPage({ onNavigate }) {
  const { currentOrder, requestOrderCancellation, clearOrder } = useOrder();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelComment, setCancelComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [isDirectCancel, setIsDirectCancel] = useState(false);
  const [cancelType, setCancelType] = useState('full'); // 'full' or 'partial'
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isPartialSuccess, setIsPartialSuccess] = useState(false);
  const [statusAlertVisible, setStatusAlertVisible] = useState(false);
  const [prevStatus, setPrevStatus] = useState(currentOrder?.status);


  // Cancellation reasons
  const reasons = [
    "Changed my mind",
    "Wrong order",
    "Delay",
    "Other"
  ];

  // Automatically redirect to feedback when completed or served
  React.useEffect(() => {
    const status = currentOrder?.status?.toUpperCase();
    
    // Status Change Feedback (Sync with socket events)
    if (status && status !== prevStatus) {
        setPrevStatus(status);
        if (status !== 'PENDING') {
            setStatusAlertVisible(true);
        }
    }

    if (status === 'PAYMENT_REQUIRED') {
        const timer = setTimeout(() => {
            onNavigate('payment', { 
                orderId: currentOrder.id, 
                stewardId: currentOrder.steward_id 
            });
        }, 1500); 
        return () => clearTimeout(timer);
    }

    if (['COMPLETED', 'FINISHED', 'PAYMENT_COMPLETED'].includes(status)) {
        const isPaid = !!currentOrder?.paid_at || status === 'PAYMENT_COMPLETED';
        const isAutoClosed = currentOrder?.isAutoClosed;

        const timer = setTimeout(async () => {
            if (isAutoClosed) {
                await clearOrder(false);
                onNavigate('welcome');
            } else {
                onNavigate(isPaid ? 'feedback' : 'payment', { 
                    orderId: currentOrder.id, 
                    steward_id: currentOrder.steward_id 
                });
            }
        }, isAutoClosed ? 5000 : 3000); 
        return () => clearTimeout(timer);
    }
    
    // REDIRECT IF CANCELLED (Requirement)
    if (status === 'CANCELLED' || status === 'REJECTED') {
        const timer = setTimeout(async () => {
            await clearOrder(false);
            onNavigate('menu');
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [currentOrder?.status, onNavigate, currentOrder?.id, currentOrder?.steward_id, clearOrder]);

  if (!currentOrder && !cancelSuccess) {
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
    if (cancelType === 'partial' && selectedItemIds.length === 0) {
        alert('Please select the items you wish to cancel.');
        return;
    }
    
    setLoading(true);
    try {
      const finalReason = cancelReason === 'Other' ? `Other: ${cancelComment}` : cancelReason;
      const response = await requestOrderCancellation({ 
          reason: finalReason, 
          itemIds: cancelType === 'partial' ? selectedItemIds : null 
      });
      
      setCancelSuccess(true); 

      // AUTOMATIC REDIRECTION for DIRECT Cancellations (Requirement)
      if (response.success && response.isDirect) {
          setIsDirectCancel(true);
          setTimeout(async () => {
              if (cancelType === 'partial') {
                  setCancelSuccess(false);
                  setIsPartialSuccess(false);
                  // Item was already removed on backend, refreshing UI will show new total
              } else {
                  await clearOrder(false); // Full cancel clear session
                  onNavigate('menu');
              }
          }, 3000); // 3 seconds to see the success message
      }
    } catch (err) {
      alert('Failed to submit cancellation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if cancellation is allowed (Requirement 9: ONLY BEFORE Preparing)
  const canCancel = [
    'PENDING', 'NEW', 'ORDER PLACED', 'PLACED', 
    'RECEIVED', 'CONFIRMED', 'ACCEPTED'
  ].includes((currentOrder?.status || '').toUpperCase());

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
          <OrderStatusTracker currentOrder={currentOrder} />

          {/* ---- Cancellation SUCCESS banner ---- */}
          {cancelSuccess && (
            <div className="mx-4 my-3 bg-green-50 border border-green-200 rounded-2xl p-5 text-center animate-fade-in">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-green-800 text-lg mb-1">
                {isDirectCancel ? 'Order Cancelled!' : 'Request Submitted!'}
              </h3>
              <p className="text-green-700 text-sm mb-4">
                {isDirectCancel ? (
                    isPartialSuccess ? (
                        <span>Your selected items have been removed from your order. Total bill updated.</span>
                    ) : (
                        <span>Your order has been cancelled successfully. Your table is now available.</span>
                    )
                ) : (
                    <span>Your cancellation request for <strong>Order #{currentOrder?.id}</strong> has been sent.<br />Our team will process it shortly.</span>
                )}
              </p>
              <button
                onClick={async () => {
                   if (isDirectCancel && !isPartialSuccess) {
                       await clearOrder(false); // Only exit if full cancel
                       onNavigate('menu');
                   }
                   if (isPartialSuccess) {
                       setCancelSuccess(false);
                       setIsPartialSuccess(false);
                   } else if (!isDirectCancel) {
                       setCancelSuccess(false);
                   }
                }}
                className={`py-3 px-8 rounded-xl font-black text-xs uppercase tracking-widest ${
                  isDirectCancel ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 text-green-700'
                }`}
              >
                {isDirectCancel ? 'Return to Menu' : 'Got it'}
              </button>
            </div>
          )}

          {!cancelSuccess && currentOrder.cancellation_status === 'PENDING' && (
            <div className="bg-orange-50 p-3 text-orange-700 text-sm border-y border-orange-100 text-center animate-pulse">
              ⏳ Cancellation request is pending approval by manager.
            </div>
          )}

          {!cancelSuccess && currentOrder.cancellation_status === 'REJECTED' && (
            <div className="bg-red-50 p-3 text-red-700 text-sm border-y border-red-100 text-center">
              ❌ Cancellation request declined. Preparation is already in progress.
            </div>
          )}

          {/* STATUS CHANGE ALERT POPUP */}
          {statusAlertVisible && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[32px] w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="bg-amber-500 p-8 text-center">
                        <span className="text-5xl">🎉</span>
                        <h3 className="text-white font-black text-xl mt-4 uppercase tracking-tighter">Status Update</h3>
                    </div>
                    <div className="p-8 text-center">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Order #{currentOrder.id}</p>
                        <p className="text-gray-900 font-black text-2xl uppercase tracking-tighter leading-none mb-4 italic">
                            {(currentOrder.status || '').replace(/_/g, ' ')}
                        </p>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            Our team has updated your order status. Prepare for deliciousness!
                        </p>
                        <button 
                            onClick={() => setStatusAlertVisible(false)}
                            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-widest hover:bg-black transition-colors"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            </div>
          )}
        </div>

        <div className="bg-white p-5 border-y border-gray-100 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 p-2 rounded-lg">
                <ClipboardListIcon className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-bold text-gray-900">Ordered Items</h3>
            </div>
            <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest whitespace-nowrap">
              {currentOrder.items?.length || 0} { (currentOrder.items?.length === 1) ? 'item' : 'items' }
            </span>
          </div>

          <div className="space-y-4">
            {currentOrder.items && currentOrder.items.length > 0 ? (
                currentOrder.items.map((item, idx) => {
                  const itemName = item.menuItem?.name || item.name || 'Unknown Item';
                  const itemPrice = item.menuItem?.price || item.price || 0;
                  const itemQty = item.quantity || 1;
                  
                  return (
                    <div
                        key={`${item.menuItem?.id || item.id || idx}-${idx}`}
                        className="flex justify-between items-start animate-in fade-in slide-in-from-left-2 duration-300 border-b border-gray-50 pb-3 last:border-0"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        <div className="flex gap-4">
                            <span className="font-black text-gray-900 bg-gray-50 border border-gray-100 w-8 h-8 rounded-lg flex items-center justify-center text-xs">
                                {itemQty}
                            </span>
                            <div className="flex-1">
                                <p className="text-gray-900 font-bold text-sm leading-tight mb-0.5">{itemName}</p>
                                <p className="text-[10px] text-gray-400 font-medium">Unit Price: Rs. {Number(itemPrice).toLocaleString()}</p>
                                
                                {canCancel && (
                                    <button 
                                        onClick={() => {
                                            setCancelType('partial');
                                            setSelectedItemIds([item.id]);
                                            setCancelModalOpen(true);
                                        }}
                                        className="text-[10px] text-red-500 font-bold uppercase tracking-tighter mt-1 hover:underline"
                                    >
                                        Remove Item
                                    </button>
                                )}
                            </div>
                        </div>
                        <span className="font-bold text-gray-900 text-sm whitespace-nowrap ml-4">
                            Rs. {(itemPrice * itemQty).toLocaleString()}
                        </span>
                    </div>
                  );
                })
            ) : (
                <div className="text-center py-4 text-gray-400 text-sm italic">
                    Loading items...
                </div>
            )}
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

          {['SERVED', 'READY', 'READY_TO_SERVE'].includes(currentOrder.status?.toUpperCase()) && (
            <Button fullWidth onClick={() => onNavigate('payment')}>
              Proceed to Payment
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Modal (Item 10) */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-black text-gray-900 mb-2">
               Cancellation Options
            </h3>
            
            {/* Full/Partial Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
                <button 
                    onClick={() => setCancelType('full')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${cancelType === 'full' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                    Entire Order
                </button>
                <button 
                    onClick={() => setCancelType('partial')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${cancelType === 'partial' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                    Specific Items
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-6 mb-6">
                {cancelType === 'partial' && (
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                            Select items to remove
                        </label>
                        {currentOrder.items.map((item, index) => {
                            const itemId = item.id || item.menuItem?.id;
                            const isSelected = selectedItemIds.includes(itemId);
                            
                            return (
                                <label 
                                    key={itemId || `item-${index}`} 
                                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-50 bg-gray-50'}`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={(e) => {
                                            if (itemId === undefined) return; // Prevent selection of items without valid IDs
                                            if (e.target.checked) setSelectedItemIds(prev => [...prev, itemId]);
                                            else setSelectedItemIds(prev => prev.filter(id => id !== itemId));
                                        }}
                                        className="w-5 h-5 accent-red-500"
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-gray-900">{item.name || item.menuItem?.name}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">Qty: {item.quantity}</p>
                                    </div>
                                    <span className="font-bold text-sm text-gray-900">
                                        Rs. {((item.price || item.menuItem?.price || 0) * item.quantity).toLocaleString()}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}

                <div className="space-y-4">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-2">
                         Why are you cancelling?
                      </label>
                      <select
                         value={cancelReason}
                         onChange={(e) => setCancelReason(e.target.value)}
                         className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-red-500 appearance-none shadow-inner font-medium"
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
                         placeholder="Please tell us more..."
                         className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500 shadow-inner min-h-[80px]"
                      />
                   )}
                </div>
            </div>

            <div className="flex flex-col gap-3">
               <Button
                 fullWidth
                 className="bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-200 uppercase tracking-wider text-xs"
                 onClick={submitCancel}
                 disabled={!cancelReason || (cancelReason === 'Other' && !cancelComment.trim()) || (cancelType === 'partial' && selectedItemIds.length === 0) || loading}
               >
                                {loading ? (
                        <span className="flex items-center justify-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                             Processing...
                        </span>
                    ) : (
                        cancelType === 'partial' ? `Remove Selected (${selectedItemIds.length})` : 'Cancel Entire Order'
                    )}
               </Button>
               <Button
                 variant="ghost"
                 fullWidth
                 className="text-gray-400 font-bold"
                 onClick={() => {
                   setCancelModalOpen(false);
                   setCancelReason('');
                   setCancelComment('');
                   setSelectedItemIds([]);
                   setCancelType('full');
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
