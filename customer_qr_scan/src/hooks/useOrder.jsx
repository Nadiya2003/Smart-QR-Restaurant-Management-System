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
    return params.get('table') || '05'; // Fallback to 05 for demo
  };

  useEffect(() => {
    if (user) {
      fetchOrderHistory();
    }
  }, [user]);

  const fetchOrderHistory = async () => {
    try {
      const data = await api.get('/orders/customer');
      setOrderHistory(data.orders || []);
      
      // Check if there's an active dine-in order
      const activeDineIn = data.orders.find(o => o.type === 'DINE-IN' && o.status !== 'FINISHED' && o.status !== 'CANCELLED');
      if (activeDineIn) {
        // We'd need detailed info to set as currentOrder, maybe fetch by ID
        setCurrentOrder({
          ...activeDineIn,
          items: [] // Need to fetch items if schema allows
        });
      }
    } catch (error) {
      console.error('Failed to fetch order history:', error);
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
    // For now, just placing a new order for the same table
    // In a mature system, we'd append to existing order ID
    return placeOrder(items, additionalTotal);
  };

  const cancelItem = (itemId) => {
    // Not implemented in backend yet for customers
    console.warn('Cancel item not implemented in backend');
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
      updateOrderStatus,
      clearCurrentOrder,
      tableNumber: getTableNumber()
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

