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
      return tableFromUrl;
    }
    
    return localStorage.getItem('activeTable') || '05'; // Fallback to 05
  };

  const isGuest = !user;

  useEffect(() => {
    // Poll for status updates
    const interval = setInterval(() => {
      if (user) {
        fetchOrderHistory();
      } else if (currentOrder?.id || getTableNumber()) {
        fetchGuestOrder();
      }
    }, 5000); // Improved polling: 5s for real-time feel
    
    // Initial fetch
    if (user) fetchOrderHistory();
    else fetchGuestOrder();
    
    return () => clearInterval(interval);
  }, [user, currentOrder?.id]);

  const fetchOrderHistory = async () => {
    try {
      const data = await api.get('/orders/customer');
      const orders = data.orders || [];
      setOrderHistory(orders);
      
      // Check if there's an active dine-in order
      const activeDineIn = orders.find(o => 
        o.type === 'DINE-IN' && 
        !['COMPLETED', 'CANCELLED', 'FINISHED'].includes(o.status?.toUpperCase())
      );
      
      if (activeDineIn) {
        // If we found an active order, update currentOrder with its data
        setCurrentOrder(prev => {
          // If we had a local order with items, don't overwrite items unless we can fetch them
          // For now, let's just update the status and basic info
          return {
            ...(prev || {}),
            ...activeDineIn,
            id: activeDineIn.id,
            status: activeDineIn.status?.toUpperCase(),
            tableNumber: activeDineIn.tableNumber || prev?.tableNumber || getTableNumber(),
            total: activeDineIn.total_price || prev?.total || 0,
            items: prev?.items || [] // We keep current items for now as schema join might be limited
          };
        });
      } else {
        // If no active order in history, but we have a served one recently, maybe clear?
        // Let's not clear automatically to allow user to view final status
      }
    } catch (error) {
      console.error('Failed to fetch order history:', error);
    }
  };

  const fetchGuestOrder = async () => {
    try {
      const tableNumber = getTableNumber();
      const data = await api.get(`/orders/active-table/${tableNumber}`);
      if (data.order) {
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
      setOrderHistory((prev) => [newOrder, ...prev]);
      return response;
    } catch (error) {
      console.error('Failed to place order:', error);
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
      
      // Update local state items if possible or just refresh
      setCurrentOrder(prev => ({
        ...prev,
        items: [...prev.items, ...items]
      }));
      
      return response;
    } catch (error) {
      console.error('Failed to add to order:', error);
      throw error;
    }
  };

  const requestOrderCancellation = async (reason) => {
    if (!currentOrder?.id) return;
    try {
      const response = await api.post(`/orders/dine-in/cancel-request/${currentOrder.id}`, { reason });
      
      // Update local state
      setCurrentOrder(prev => ({
        ...prev,
        cancellation_status: 'PENDING'
      }));
      
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

  const clearCurrentOrder = () => {
    setCurrentOrder(null);
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
      clearCurrentOrder,
      tableNumber: getTableNumber(),
      isGuest
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}

