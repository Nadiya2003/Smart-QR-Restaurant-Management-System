import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { OrderStatusTracker } from '../components/order/OrderStatusTracker';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';

export function OrderTrackingPage({ onNavigate }) {
  const { currentOrder, cancelItem } = useOrder();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="Active Order" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
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

  const handleCancelRequest = (itemId) => {
    setItemToCancel(itemId);
    setCancelModalOpen(true);
  };

  const submitCancel = async () => {
    if (itemToCancel) {
      try {
        await cancelItem(itemToCancel, cancelReason);
        setCancelModalOpen(false);
        setItemToCancel(null);
        setCancelReason('');
        alert('Cancellation request submitted!');
      } catch (err) {
        alert('Failed to request cancellation: ' + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header title={`Order ${currentOrder.id}`} />

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white mb-2">
          <OrderStatusTracker currentStatus={currentOrder.status} />
          {currentOrder.cancellation_status === 'PENDING' && (
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
                    {['PENDING', 'received'].includes(currentOrder.status) && (
                      <button
                        onClick={() => handleCancelRequest(item.menuItem?.id || item.id)}
                        className="text-xs text-red-500 hover:text-red-600 mt-1"
                      >
                        Cancel Item
                      </button>
                    )}
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

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Cancel Item
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for cancellation.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="E.g., Changed my mind"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gray-900"
              rows={3}
            />

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setCancelModalOpen(false)}
              >
                Keep Item
              </Button>
              <Button
                fullWidth
                onClick={submitCancel}
                disabled={!cancelReason.trim()}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav currentPage="tracking" onNavigate={onNavigate} />
    </div>
  );
}
