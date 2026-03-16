import React from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { Button } from './Button';

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Place Order",
  cancelText = "Cancel",
  type = "default" 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-gray-900 text-white'}`}>
              <ShoppingBag size={32} />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
            {title}
          </h3>
          
          <p className="text-gray-500 text-center text-sm leading-relaxed mb-8">
            {message}
          </p>
          
          <div className="space-y-3">
            <Button 
              fullWidth 
              size="lg"
              onClick={onConfirm}
              className="rounded-xl shadow-lg shadow-gray-200"
            >
              {confirmText}
            </Button>
            
            <Button 
              fullWidth 
              variant="secondary" 
              size="lg"
              onClick={onClose}
              className="rounded-xl"
            >
              {cancelText}
            </Button>
          </div>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="text-gray-400" size={20} />
        </button>
      </div>
    </div>
  );
}
