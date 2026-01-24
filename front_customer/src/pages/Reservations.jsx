import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function Reservations() {
  const [reservations] = useState([
    { id: 1, date: '2025-01-25', time: '7:00 PM', guests: 4, status: 'confirmed' },
    { id: 2, date: '2025-01-26', time: '6:30 PM', guests: 2, status: 'confirmed' },
    { id: 3, date: '2025-01-20', time: '8:00 PM', guests: 6, status: 'completed' },
  ]);

  return (
    <div className="min-h-screen bg-dark-gradient md:ml-64 mb-20 md:mb-0 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Reservations</h1>
          <p className="text-gray-400">Manage your table reservations</p>
        </div>
        <Button className="mb-8">+ Make a Reservation</Button>
        <div className="space-y-4">
          {reservations.map((res) => (
            <GlassCard key={res.id}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{res.date}</p>
                  <p className="text-sm text-gray-400">{res.time} — {res.guests} guests</p>
                </div>

                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${res.status === 'confirmed'
                    ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                    : 'bg-blue-600/20 text-blue-400 border border-blue-600/50'
                    }`}
                >
                  {res.status === 'confirmed' ? 'Confirmed' : 'Completed'}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Reservations;
