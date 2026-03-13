import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

/**
 * Reservation Page - Table booking form
 * Allows users to reserve a table at the restaurant
 * Updated to GOLD theme + Backend Integration
 */
function Reservation() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Form state
    const [formData, setFormData] = useState({
        name: user?.user?.name || '',
        phone: user?.user?.phone || '',
        email: user?.user?.email || '',
        date: '',
        time: '',
        guests: '2',
        specialRequest: '',
    });

    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    // Handle input changes
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            setError('Please login to make a reservation');
            setTimeout(() => navigate('/auth'), 1500);
            return;
        }

        // Validation
        if (!formData.name || !formData.date || !formData.time || !formData.email) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: formData.date,
                    time: formData.time,
                    guests: formData.guests,
                    special_request: formData.specialRequest
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setShowSuccess(true);
                setFormData({
                    ...formData,
                    date: '',
                    time: '',
                    guests: '2',
                    specialRequest: '',
                });
                // Hide success message after 5 seconds
                setTimeout(() => setShowSuccess(false), 5000);
            } else {
                setError(data.message || 'Failed to submit reservation');
            }
        } catch (err) {
            console.error('Reservation error:', err);
            setError('Network error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-12">
            <div className="container mx-auto max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text mb-4">
                        Reserve Your Table
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Book a table at Melissas Food Court for an unforgettable dining experience
                    </p>
                </div>

                {/* Status Messages */}
                {showSuccess && (
                    <div className="mb-6 bg-green-500/20 border border-green-500 rounded-xl p-4 text-center animate-slide-up">
                        <p className="text-white font-medium">
                            ✅ Reservation request submitted! We will contact you shortly.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 text-center animate-slide-up">
                        <p className="text-white font-medium">❌ {error}</p>
                    </div>
                )}

                {/* Reservation Form */}
                <GlassCard className="animate-slide-up border-[#D4AF37]/20 shadow-xl shadow-[#D4AF37]/5">
                    {!isAuthenticated ? (
                        <div className="text-center py-10">
                            <div className="text-5xl mb-6">🔒</div>
                            <h3 className="text-xl font-bold text-white mb-4">Login Required</h3>
                            <p className="text-gray-400 mb-8">You must be logged in to reserve a table.</p>
                            <Button onClick={() => navigate('/auth')} className="bg-[#D4AF37] text-black px-10">
                                Login / Register
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                                <p className="text-sm text-gray-400">Reserving as:</p>
                                <p className="text-[#D4AF37] font-bold">{user.user.name}</p>
                            </div>

                        {/* Date and Time Row */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Date Input */}
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
                                    Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="input-glass w-full focus:ring-[#D4AF37]/50"
                                    required
                                />
                            </div>

                            {/* Time Input */}
                            <div>
                                <label htmlFor="time" className="block text-sm font-medium text-gray-300 mb-2">
                                    Time <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="time"
                                    id="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="input-glass w-full focus:ring-[#D4AF37]/50"
                                    required
                                />
                            </div>
                        </div>

                        {/* Number of Guests */}
                        <div>
                            <label htmlFor="guests" className="block text-sm font-medium text-gray-300 mb-2">
                                Number of Guests
                            </label>
                            <select
                                id="guests"
                                name="guests"
                                value={formData.guests}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                            >
                                <option value="1">1 Guest</option>
                                <option value="2">2 Guests</option>
                                <option value="3">3 Guests</option>
                                <option value="4">4 Guests</option>
                                <option value="5">5 Guests</option>
                                <option value="6">6 Guests</option>
                                <option value="7">7 Guests</option>
                                <option value="8">8 Guests</option>
                                <option value="9">9 Guests</option>
                                <option value="10+">10+ Guests</option>
                            </select>
                        </div>

                        {/* Special Request */}
                        <div>
                            <label htmlFor="specialRequest" className="block text-sm font-medium text-gray-300 mb-2">
                                Special Request (Optional)
                            </label>
                            <textarea
                                id="specialRequest"
                                name="specialRequest"
                                value={formData.specialRequest}
                                onChange={handleChange}
                                className="input-glass w-full h-24 focus:ring-[#D4AF37]/50 resize-none"
                                placeholder="e.g., Birthday celebration, window seat, allergies..."
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <Button type="submit" className="w-full bg-[#D4AF37] hover:bg-[#E6C86E] text-black" size="lg" disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm Reservation'}
                        </Button>
                    </form>
                    )}
                </GlassCard>

                {/* Info Section */}
                <div className="mt-8 text-center border-t border-white/5 pt-8">
                    <p className="text-gray-400">
                        For groups larger than 10 or special event arrangements,
                        please contact us directly at{' '}
                        <span className="text-[#D4AF37] font-medium">+94 77 123 4567</span>
                    </p>
                </div>
            </div>
        </div>
    );
}


export default Reservation;
