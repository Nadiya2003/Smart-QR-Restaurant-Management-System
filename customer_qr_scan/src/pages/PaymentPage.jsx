import React, { useState } from 'react';
import {
  BanknoteIcon,
  CreditCardIcon,
  SmartphoneIcon,
  UploadIcon,
  CheckCircleIcon
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { useOrder } from '../hooks/useOrder';

export function PaymentPage({ onNavigate }) {
  const { currentOrder, clearOrder, isGuest } = useOrder();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  if (!currentOrder && paymentStatus !== 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header
        title="Settle Bill"
        showBack
        onBack={() => onNavigate('dashboard')}
        onNavigate={onNavigate}
      />  <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-500">No active order to pay for.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handlePayment = async () => {
    if (selectedMethod === 'online' && !selectedFile) {
        alert('Please upload your payment slip first.');
        return;
    }

    setPaymentStatus('processing');
    
    try {
        const formData = new FormData();
        formData.append('orderId', currentOrder.id);
        formData.append('method', selectedMethod);
        formData.append('total', currentOrder.total);
        if (selectedFile) {
            formData.append('slip', selectedFile);
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/request-payment`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header when using FormData, browser does it with boundary
        });

        if (response.ok) {
            setPaymentStatus('success');
            // Close the order immediately on success (Terminates session & frees table)
            await clearOrder(true);
        } else {
            const err = await response.json();
            alert(err.message || 'Payment request failed');
            setPaymentStatus('idle');
        }
    } catch (err) {
        console.error('Payment error:', err);
        alert('Failed to connect to server');
        setPaymentStatus('idle');
    }
  };

  const handleFinish = () => {
    // Order is already cleared by handlePayment, just navigate
    onNavigate('feedback');
  };

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <CheckCircleIcon className="w-20 h-20 text-green-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-500 mb-8">
          {selectedMethod === 'online' ?
            'Your payment slip has been submitted for verification.' :
            'Steward has been notified and will collect your payment shortly.'}
        </p>
        <Button fullWidth size="lg" onClick={handleFinish}>
          Rate Your Experience
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Payment" showBack onBack={() => onNavigate('dashboard')} />

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-6 text-center mb-6 shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm mb-1">Total Amount Due</p>
          <h2 className="text-4xl font-bold text-gray-900">
            Rs. {currentOrder?.total?.toLocaleString() || '0'}
          </h2>
        </div>

        <h3 className="font-semibold text-gray-900 mb-4 px-1">
          Select Payment Method
        </h3>

        <div className="space-y-3 mb-8 relative">
          {isGuest && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center rounded-2xl border-2 border-dashed border-gray-200">
               <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-xl">🔒</span>
               </div>
               <h4 className="font-bold text-gray-900 text-sm">Account Required</h4>
               <p className="text-[11px] text-gray-500 mb-4">Please login or register to complete your payment and secure your order details.</p>
               <Button 
                size="sm" 
                className="rounded-full px-6 h-9 text-[10px] font-black uppercase tracking-wider"
                onClick={() => onNavigate('login')}
               >
                 Login to Pay
               </Button>
            </div>
          )}

          <button
            onClick={() => setSelectedMethod('cash')}
            disabled={isGuest}
            className={`w-full flex items-center p-4 rounded-xl border ${selectedMethod === 'cash' ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${selectedMethod === 'cash' ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-500'}`}
            >
              <BanknoteIcon className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-semibold text-gray-900">Cash</h4>
              <p className="text-sm text-gray-500">Pay at table</p>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod('card')}
            disabled={isGuest}
            className={`w-full flex items-center p-4 rounded-xl border ${selectedMethod === 'card' ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${selectedMethod === 'card' ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-500'}`}
            >
              <CreditCardIcon className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-semibold text-gray-900">Card</h4>
              <p className="text-sm text-gray-500">Pay at table with POS</p>
            </div>
          </button>

          <button
            onClick={() => setSelectedMethod('online')}
            disabled={isGuest}
            className={`w-full flex items-center p-4 rounded-xl border ${selectedMethod === 'online' ? 'border-gray-900 ring-1 ring-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${selectedMethod === 'online' ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-500'}`}
            >
              <SmartphoneIcon className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <h4 className="font-semibold text-gray-900">Online Transfer</h4>
              <p className="text-sm text-gray-500">Bank transfer</p>
            </div>
          </button>
        </div>

        {selectedMethod === 'online' && (
          <div className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Bank Details</h4>
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 font-mono">
              <p>Bank: Bank of Ceylon</p>
              <p>Account: 8012-3456-7890</p>
              <p>Name: Melissa's Food Court</p>
            </div>

            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative overflow-hidden">
               <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
               />
               {filePreview ? (
                  <div className="space-y-2">
                     <img src={filePreview} alt="Preview" className="h-32 mx-auto rounded-lg shadow-sm" />
                     <p className="text-xs text-green-600 font-bold">✓ {selectedFile.name}</p>
                     <p className="text-[10px] text-gray-400">Tap to change image</p>
                  </div>
               ) : (
                  <>
                    <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      Upload Payment Slip
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  </>
               )}
            </label>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 pb-safe">
        <Button
          fullWidth
          size="lg"
          disabled={!selectedMethod || paymentStatus === 'processing'}
          onClick={handlePayment}
        >
          {paymentStatus === 'processing' ?
            'Processing...' :
            selectedMethod === 'online' ?
            'Submit Payment' :
            'Request Payment'}
        </Button>
      </div>
    </div>
  );
}
