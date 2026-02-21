import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useCustomer } from '../context/CustomerContext';
import { useNavigate } from 'react-router-dom';

function Reservations() {
  const { customerData, isCustomerLoggedIn } = useCustomer();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isCustomerLoggedIn) {
      fetchReservations();
    } else {
      setLoading(false);
    }
  }, [isCustomerLoggedIn]);

  const fetchReservations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reservations/my', {
        headers: {
          'Authorization': `Bearer ${customerData.token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setReservations(data.reservations || []);
      } else {
        setError(data.message || 'Failed to fetch reservations');
      }
    } catch (err) {
      setError('Network error. Could not load reservations.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (!isCustomerLoggedIn) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center px-4">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-gray-400 mb-6">Please log in to see your reservations.</p>
          <Button onClick={() => navigate('/customer/auth')}>Go to Login</Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-gradient mb-20 md:mb-0 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Reservations</h1>
          <p className="text-gray-400">Manage your table reservations</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading your reservations...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {reservations.length > 0 ? (
                reservations.map((res) => {
                  const { date, time } = formatDateTime(res.reservation_time);
                  return (
                    <GlassCard key={res.id}>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-white">{date}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">🕒 {time}</span>
                            <span className="flex items-center gap-1">🪑 Table {res.table_number || 'TBD'}</span>
                            <span className="flex items-center gap-1">👥 {res.guest_count} guests</span>
                          </div>
                        </div>

                        <span
                          className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${res.status === 'CONFIRMED'
                              ? 'bg-green-600/10 text-green-400 border-green-600/30'
                              : res.status === 'PENDING'
                                ? 'bg-yellow-600/10 text-yellow-400 border-yellow-600/30'
                                : 'bg-blue-600/10 text-blue-400 border-blue-600/30'
                            }`}
                        >
                          {res.status}
                        </span>
                      </div>
                    </GlassCard>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-gray-400">No reservations found.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Reservations;
