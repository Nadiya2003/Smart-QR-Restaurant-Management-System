import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function StaffDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([
    { id: '#12345', customer: 'Kasun', items: ['Kottu Roti', 'Lamprais'], status: 'cooking' },
    { id: '#12346', customer: 'Nimal', items: ['Pizza'], status: 'serving' },
  ]);

  const handleLogout = () => {
    localStorage.removeItem('staffAuth');
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen p-6 text-white pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gold">Staff Dashboard</h1>
          <p className="text-gray-400">Manage orders and service</p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Stats/Orders */}
      <div className="grid gap-6">
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gold">Assigned Orders</h2>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <h3 className="font-medium text-lg">{order.id} - {order.customer}</h3>
                  <p className="text-sm text-gray-400">{order.items.join(', ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${order.status === 'cooking' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                    {order.status}
                  </span>
                  <Button className="text-sm py-2 px-4" variant="primary">
                    Update
                  </Button>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-500 py-4">No active orders assigned.</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default StaffDashboard;