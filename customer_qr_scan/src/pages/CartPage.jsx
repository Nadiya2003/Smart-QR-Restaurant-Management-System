import React, { useState } from 'react';
import { ShoppingCartIcon } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { CartItem } from '../components/cart/CartItem';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useCart } from '../hooks/useCart';
import { useOrder } from '../hooks/useOrder';

export function CartPage({ onNavigate }) {
  const {
    cartItems,
    updateQuantity,
    removeItem,
    subtotal,
    serviceCharge,
    tax,
    total,
    clearCart
  } = useCart();
  
  const { currentOrder, placeOrder, addToExistingOrder, selectedStewardId } = useOrder();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) return;
    
    // Logic: New order must have a steward selected
    if (!selectedStewardId && !currentOrder) {
      onNavigate('steward');
      return;
    }
    
    setIsConfirmOpen(true);
  };

  const onConfirmOrder = async () => {
    try {
      const isUpdate = currentOrder && !['SERVED', 'COMPLETED', 'CANCELLED'].includes(currentOrder.status?.toUpperCase());
      if (isUpdate) {
        await addToExistingOrder(cartItems, total);
      } else {
        await placeOrder(cartItems, total);
      }
      clearCart();
      setIsConfirmOpen(false);
      onNavigate('tracking');
    } catch (error) {
      console.error('Order placement failed:', error);
      alert('Could not place order. Please try again.');
      setIsConfirmOpen(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header title="Your Cart" />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <ShoppingCartIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Looks like you haven't added any items yet.
          </p>
          <Button onClick={() => onNavigate('menu')}>Browse Menu</Button>
        </div>
        <BottomNav currentPage="cart" onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      <Header
        title={`Your Cart (${cartItems.length})`}
        showBack
        onBack={() => onNavigate('menu')}
        onNavigate={onNavigate}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white px-4 py-2 border-b border-gray-100">
          {cartItems.map((item) => (
            <CartItem
              key={item.menuItem.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>

        <div className="p-4 mt-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Service Charge (10%)</span>
              <span>Rs. {serviceCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (5%)</span>
              <span>Rs. {tax.toLocaleString()}</span>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-lg">Total</span>
              <span className="font-bold text-gray-900 text-xl">
                Rs. {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 w-full max-w-md bg-white p-4 border-t border-gray-100 z-10">
        <Button fullWidth size="lg" onClick={handlePlaceOrder}>
          {currentOrder && currentOrder.status !== 'served' ?
            'Add to Order' :
            'Place Order'}{' '}
          • Rs. {total.toLocaleString()}
        </Button>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={onConfirmOrder}
        title={currentOrder && currentOrder.status !== 'SERVED' ? "Add to Order?" : "Confirm Order?"}
        message={
          currentOrder && currentOrder.status !== 'SERVED' 
          ? `Extend your current order with these ${cartItems.length} items?`
          : `Ready to enjoy your meal? Your total is Rs. ${total.toLocaleString()}.`
        }
        confirmText={currentOrder && currentOrder.status !== 'SERVED' ? "Add Items" : "Place Order"}
      />

      <BottomNav currentPage="cart" onNavigate={onNavigate} />
    </div>
  );
}
