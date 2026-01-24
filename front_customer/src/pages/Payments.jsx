import { useState } from 'react';
import GlassCard from '../components/GlassCard';

function Payments() {
  const [payments] = useState([
    { id: 1, orderId: '#12345', amount: 1800, status: 'paid', date: '2025-01-23', method: 'Card' },
    { id: 2, orderId: '#12344', amount: 1200, status: 'paid', date: '2025-01-22', method: 'Cash' },
    { id: 3, orderId: '#12343', amount: 2850, status: 'pending', date: '2025-01-21', method: 'Card' },
  ]);

  return (
    <div className="min-h-screen bg-dark-gradient md:ml-64 mb-20 md:mb-0 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Payments</h1>
          <p className="text-gray-400">Payment history and invoices</p>
        </div>
        <div className="space-y-4">
          {payments.map((payment) => (
            <GlassCard key={payment.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{payment.orderId}</p>
                  <p className="text-sm text-gray-400">{payment.date} {payment.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gold-500">Rs. {payment.amount}</p>

                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${payment.status === 'paid' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}`}
                  >
                    {payment.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Payments;
