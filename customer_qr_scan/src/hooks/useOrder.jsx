import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './useAuth';

const OrderContext = createContext(undefined);

export function OrderProvider({ children }) {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedStewardId, setSelectedStewardId] = useState(null);
  const { user } = useAuth();
  
  const getTableNumber = () => {
    const params = new URLSearchParams(window.location.search);
    const tableFromUrl = params.get('table');
    
    if (tableFromUrl) {
      localStorage.setItem('activeTable', tableFromUrl);
      // Remove table from URL to prevent re-setting if user navigates back
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      return tableFromUrl;
    }
    
    return localStorage.getItem('activeTable') || null;
  };

  const [tableNumber, setTableNumber] = useState(getTableNumber());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const setTable = (num) => {
    localStorage.setItem('activeTable', num);
    setTableNumber(num);
  };

  const isGuest = !user;

  useEffect(() => {
    // If logging out, clear order immediately to prevent stale redirection on Welcome
    if (!user) {
        setCurrentOrder(null);
    }

    const initFetch = async () => {
        if (user) await fetchOrderHistory();
        else await fetchGuestOrder();
        setIsInitialLoading(false);
    };
    initFetch();

    // Poll for status updates
    const interval = setInterval(() => {
      if (user) {
        fetchOrderHistory();
      } else if (currentOrder?.id || getTableNumber()) {
        fetchGuestOrder();
      }
    }, 5000); // Improved polling: 5s for real-time feel
    
    return () => clearInterval(interval);
  }, [user, currentOrder?.id]);

  const fetchOrderHistory = async () => {
    try {
      const data = await api.get('/orders/customer');
      const orders = data.orders || [];
      setOrderHistory(orders);
      
      // Check if we have a current session order tracked locally
      const storedOrderId = localStorage.getItem('activeOrderId');
      
      if (storedOrderId) {
        // Case 1: We have a locally tracked order — try to sync its status
        const matchingOrder = orders.find(o => o.id.toString() === storedOrderId);
        // Allow COMPLETED/FINISHED orders to stay in state so they can trigger the Feedback redirect in OrderTrackingPage
        if (matchingOrder && !['CANCELLED'].includes(matchingOrder.status?.toUpperCase())) {
          setCurrentOrder(prev => ({
            ...(prev || {}),
            ...matchingOrder,
            id: matchingOrder.id,
            status: matchingOrder.status?.toUpperCase(),
            total: matchingOrder.total_price || prev?.total || 0,
            items: matchingOrder.items || prev?.items || []
          }));
        } else if (matchingOrder && matchingOrder.status?.toUpperCase() === 'CANCELLED') {
          // Cancelled: clear local focus immediately
          localStorage.removeItem('activeOrderId');
          localStorage.removeItem('activeTable');
          setCurrentOrder(null);
        }
      } else {
        // Case 2: No local order ID (e.g. user logged out and back in)
        // Look for any recent active DINE-IN order placed within the last 6 hours
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        const recentActiveOrder = orders.find(o => {
          const isActive = !['COMPLETED', 'CANCELLED', 'FINISHED'].includes(o.status?.toUpperCase());
          const isDineIn = o.type === 'DINE-IN' || o.order_type === 'registered' || o.order_type === 'guest';
          const isRecent = new Date(o.created_at).getTime() > sixHoursAgo;
          return isActive && isDineIn && isRecent;
        });
        
        if (recentActiveOrder) {
          // Restore the session
          localStorage.setItem('activeOrderId', recentActiveOrder.id.toString());
          if (recentActiveOrder.table_number) {
            localStorage.setItem('activeTable', recentActiveOrder.table_number.toString());
            setTableNumber(recentActiveOrder.table_number.toString());
          }
          setCurrentOrder({
            ...recentActiveOrder,
            id: recentActiveOrder.id,
            status: recentActiveOrder.status?.toUpperCase(),
            total: recentActiveOrder.total_price || 0,
            items: recentActiveOrder.items || [],
            tableNumber: recentActiveOrder.table_number
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch order history:', error);
    }
  };

  const fetchGuestOrder = async () => {
    try {
      const tableNumber = getTableNumber();
      const storedOrderId = localStorage.getItem('activeOrderId');
      
      // Guest should only resume if they have a stored Order ID in their browser session
      if (!storedOrderId) {
        return; 
      }

      const data = await api.get(`/orders/active-table/${tableNumber}`);
      if (data.order && data.order.id.toString() === storedOrderId) {
        const o = data.order;
        setCurrentOrder(prev => ({
          ...(prev || {}),
          ...o,
          id: o.id,
          status: o.status,
          tableNumber: o.table_number,
          total: o.total_price,
          items: o.items || prev?.items || []
        }));
      } else {
        // If server returns null OR a different order, clear the local session focus
        // This ensures fresh start after server restart or checkout/completion
        localStorage.removeItem('activeOrderId');
        setCurrentOrder(null);
      }
    } catch (error) {
      console.error('Failed to fetch guest order:', error);
    }
  };

  const setSteward = (id) => {
    setSelectedStewardId(id);
  };

  const placeOrder = async (items, total) => {
    try {
      const tableNumber = getTableNumber();
      const orderData = {
        table_number: tableNumber,
        steward_id: selectedStewardId,
        items: items.map(item => ({
          id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          category: item.menuItem.category_name || item.menuItem.category
        })),
        total_price: total,
        notes: ''
      };

      const response = await api.post('/orders/dine-in', orderData);
      
      const newOrder = {
        id: response.orderId,
        items: [...items],
        status: 'PENDING',
        stewardId: selectedStewardId,
        tableNumber: tableNumber,
        timestamp: new Date().toISOString(),
        total
      };

      setCurrentOrder(newOrder);
      localStorage.setItem('activeOrderId', response.orderId.toString());
      setOrderHistory((prev) => [newOrder, ...prev]);
      return response;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  };

  const changeTable = async (newTableNumber) => {
    try {
      // If there's an active order, update it on the backend
      if (currentOrder?.id) {
        await api.post('/orders/update-table', {
          orderId: currentOrder.id,
          newTableNumber
        });
        
        setCurrentOrder(prev => ({
          ...prev,
          tableNumber: newTableNumber
        }));
      }
      
      // Update local state and storage
      setTable(newTableNumber);
      return true;
    } catch (error) {
      console.error('Failed to change table:', error);
      throw error;
    }
  };

  const addToExistingOrder = async (items, additionalTotal) => {
    if (!currentOrder?.id) return placeOrder(items, additionalTotal);
    
    try {
      const tableNumber = getTableNumber();
      const orderData = {
        table_number: tableNumber,
        steward_id: selectedStewardId,
        order_id: currentOrder.id,
        items: items.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity
        })),
        total_price: additionalTotal
      };

      const response = await api.post('/orders/dine-in', orderData);
      
      // Update local state items and total
      setCurrentOrder(prev => ({
        ...prev,
        items: [...(prev.items || []), ...items],
        total: (Number(prev.total) || 0) + additionalTotal
      }));
      
      return response;
    } catch (error) {
      console.error('Failed to add to order:', error);
      throw error;
    }
  };

  const requestOrderCancellation = async (options) => {
    if (!currentOrder?.id) return;
    const { reason, itemIds } = typeof options === 'string' ? { reason: options } : options;
    try {
      const response = await api.post(`/orders/dine-in/cancel-request/${currentOrder.id}`, { reason, itemIds });
      
      // Update local state: If it was direct (response.success), we'll eventually clear it, 
      // but if not, we show pending.
      if (!response.success) {
        setCurrentOrder(prev => ({
          ...prev,
          cancellation_status: 'PENDING'
        }));
      }
      
      return response;
    } catch (error) {
      console.error('Failed to request cancellation:', error);
      throw error;
    }
  };

  const cancelItem = async (itemId, reason) => {
    // For now, if we want to cancel an item, we use the same request mechanism but with a specific reason
    // In a real app, you might have per-item cancellation
    return requestOrderCancellation(`Cancel Item ID ${itemId}: ${reason || 'Not specified'}`);
  };

  const updateOrderStatus = (status) => {
    if (!currentOrder) return;
    const updatedOrder = { ...currentOrder, status };
    setCurrentOrder(updatedOrder);
    setOrderHistory((prev) =>
      prev.map((o) => o.id === updatedOrder.id ? updatedOrder : o)
    );
  };

    const clearOrder = async (terminateOnServer = true) => {
        try {
            if (terminateOnServer && currentOrder?.id) {
                await api.post('/orders/dine-in/end-session', { orderId: currentOrder.id });
            }
        } catch (err) {
            console.warn('Session end notification failed:', err);
        } finally {
            localStorage.removeItem('activeOrderId');
            localStorage.removeItem('activeTable');
            setCurrentOrder(null);
            setTableNumber(null);
        }
    };

    return (
        <OrderContext.Provider value={{
            currentOrder,
            orderHistory,
            selectedStewardId,
            setSteward,
            placeOrder,
            addToExistingOrder,
            cancelItem,
            requestOrderCancellation,
            updateOrderStatus,
            clearOrder,
            tableNumber,
            setTable,
            changeTable,
            isGuest,
            isInitialLoading
        }}>
            {children}
        </OrderContext.Provider>
    );
};

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}

