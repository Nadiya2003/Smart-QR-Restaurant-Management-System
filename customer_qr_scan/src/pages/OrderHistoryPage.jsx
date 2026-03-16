import React from 'react';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { useOrder } from '../hooks/useOrder';

export function OrderHistoryPage({ onNavigate }) {
  const { orderHistory } = useOrder();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        title="Order History"
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      <div className="flex-1 p-4 overflow-y-auto">
        {orderHistory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No past orders found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orderHistory.map((order) => {
              const date = new Date(order.created_at || order.timestamp).toLocaleDateString();
              const itemCount = order.items?.reduce(
                (sum, item) => sum + (item.quantity || 0),
                0
              ) || 0;
              const totalAmount = order.total_price || order.total || 0;
              const status = order.status || 'unknown';
              
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">#{order.id}</h3>
                      <p className="text-xs text-gray-500">{date}</p>
                    </div>
                    <Badge
                      variant={
                        ['served', 'completed', 'finished', 'PAID'].includes(status.toLowerCase()) ? 'success' : 'warning'
                      }
                    >
                      {status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="border-t border-gray-50 py-3 my-2">
                    <p className="text-sm text-gray-600">
                      {order.type || 'DINE-IN'} • Table {order.table_number || order.tableNumber || 'N/A'}
                    </p>
                    {order.items && order.items.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {order.items
                          .map((i) => `${i.quantity}x ${i.menuItem?.name || i.name}`)
                          .join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-medium text-gray-500">
                      Total
                    </span>
                    <span className="font-bold text-gray-900">
                      Rs. {totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
