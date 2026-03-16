import React, { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  const addItem = (menuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id ?
          { ...item, quantity: item.quantity + 1 } :
          item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeItem = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.menuItem.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const subtotal = useMemo(
    () =>
    cartItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    ),
    [cartItems]
  );

  const serviceCharge = subtotal * 0.1; // 10%
  const tax = subtotal * 0.05; // 5%
  const total = subtotal + serviceCharge + tax;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      serviceCharge,
      tax,
      total,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
