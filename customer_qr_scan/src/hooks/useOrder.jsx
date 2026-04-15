import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from './useAuth';
import { io } from 'socket.io-client';

const OrderContext = createContext(undefined);

export function OrderProvider({ children }) {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedStewardId, setSelectedStewardId] = useState(null);
  const { user } = useAuth();
  const socketRef = useRef(null);
  const lastStatus = useRef(null);

  // Status Change Sound
  const playStatusSound = () => {
    // Standard chime for status updates
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(e => console.warn('Audio feedback inhibited by browser:', e.message));
  };
  
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

    // Init Sockets for Real-Time synchronization (Requirement #5)
    const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.1.2:5000';
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('orderStatusUpdated', (data) => {
        const activeId = localStorage.getItem('activeOrderId');
        const isForThisOrder = data.orderId?.toString() === activeId || data.id?.toString() === activeId;
        
        if (isForThisOrder) {
            playStatusSound();
            setCurrentOrder(prev => prev ? { 
                ...prev, 
                status: data.mainStatus,
                main_status: data.mainStatus,
                kitchen_status: data.kitchenStatus,
                bar_status: data.barStatus
            } : prev);
        }
    });

    socket.on('orderUpdate', (data) => {
        const activeId = localStorage.getItem('activeOrderId');
        const orderIdFromData = (data.orderId || data.id)?.toString();
        const isForThisOrder = orderIdFromData === activeId;
        
        if (isForThisOrder) {
            const rawStatus = (data.mainStatus || data.status || '').toUpperCase();
            if (!rawStatus) return;

            playStatusSound();
            
            // Handle PAYMENT_REQUIRED separately as it's a virtual UI status
            if (rawStatus === 'PAYMENT_REQUIRED') {
                setCurrentOrder(prev => prev ? { ...prev, status: 'PAYMENT_REQUIRED' } : prev);
                return;
            }
            
            // Update local state immediately for visual feedback
            setCurrentOrder(prev => {
                if (!prev) return prev;
                const updated = { 
                    ...prev, 
                    status: rawStatus,
                    main_status: rawStatus,
                    kitchen_status: data.kitchenStatus || prev.kitchen_status,
                    bar_status: data.barStatus || prev.bar_status,
                    isAutoClosed: data.isAutoClosed || prev.isAutoClosed
                };
                if (data.cancellationStatus) {
                    updated.cancellation_status = data.cancellationStatus;
                }
                return updated;
            });

            // Refetch full object to ensure data consistency
            if (user) fetchOrderHistory();
            else fetchGuestOrder();
        }
    });

    socket.on('orderCancelled', (data) => {
        const activeId = localStorage.getItem('activeOrderId');
        const orderIdFromData = (data.orderId || data.id)?.toString();
        
        if (orderIdFromData === activeId) {
            playStatusSound();
            
            if (data.isPartial) {
                if (user) fetchOrderHistory();
                else fetchGuestOrder();
            } else {
                setCurrentOrder(prev => prev ? { 
                    ...prev, 
                    status: 'CANCELLED', 
                    main_status: 'CANCELLED',
                    cancellation_status: 'APPROVED'
                } : prev);
                if (user) fetchOrderHistory();
                else fetchGuestOrder();
            }
        }
    });

    socket.on('cancelRequest', (data) => {
        const activeId = localStorage.getItem('activeOrderId');
        const orderIdFromData = (data.orderId || data.id)?.toString();
        
        if (orderIdFromData === activeId && data.status) {
            setCurrentOrder(prev => prev ? { 
                ...prev, 
                cancellation_status: data.status.toUpperCase() 
            } : prev);
        }
    });

    return () => {
        if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  // Track status changes for sound/alert feedback
  useEffect(() => {
    if (currentOrder?.status && currentOrder.status !== lastStatus.current) {
        if (lastStatus.current) playStatusSound(); // Sound on change
        lastStatus.current = currentOrder.status;
    }
  }, [currentOrder?.status]);

  const fetchOrderHistory = async () => {
    try {
      const data = await api.get('/orders/customer');
      const orders = data.orders || [];
      setOrderHistory(orders);
      
      const storedOrderId = localStorage.getItem('activeOrderId');
      let sessionOrder = null;
      
      if (storedOrderId) {
        // Find the specific order we were watching
        sessionOrder = orders.find(o => o.id.toString() === storedOrderId);
        
        // If it was cancelled or completed, it's no longer the "current session order"
        if (sessionOrder && ['COMPLETED', 'FINISHED', 'CANCELLED', 'REJECTED'].includes(sessionOrder.status?.toUpperCase())) {
          localStorage.removeItem('activeOrderId');
          localStorage.removeItem('activeTable');
          sessionOrder = null;
        }
      }
      
      // If no valid stored session order, look for the most recent ACTIVE dining session
      if (!sessionOrder) {
        const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
        sessionOrder = orders.find(o => {
          const isActive = !['COMPLETED', 'CANCELLED', 'FINISHED', 'REJECTED'].includes(o.status?.toUpperCase());
          const isDineIn = o.type === 'DINE-IN' || o.order_type === 'registered' || o.order_type === 'guest';
          const isRecent = new Date(o.created_at).getTime() > sixHoursAgo;
          return isActive && isDineIn && isRecent;
        });

        if (sessionOrder) {
          localStorage.setItem('activeOrderId', sessionOrder.id.toString());
          if (sessionOrder.table_number) {
            localStorage.setItem('activeTable', sessionOrder.table_number.toString());
            setTableNumber(sessionOrder.table_number.toString());
          }
        }
      }

      if (sessionOrder) {
        setCurrentOrder({
          ...sessionOrder,
          id: sessionOrder.id,
          status: sessionOrder.status?.toUpperCase(),
          total: sessionOrder.total_price || 0,
          items: sessionOrder.items || [],
          tableNumber: sessionOrder.table_number,
          kitchen_status: sessionOrder.kitchen_status,
          bar_status: sessionOrder.bar_status,
          main_status: sessionOrder.main_status
        });
      } else {
        setCurrentOrder(null);
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
      if (response.isDirect === false) {
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
            isInitialLoading,
            fetchOrderHistory
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

