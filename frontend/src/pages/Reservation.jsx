import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import TableSelection from '../components/TableSelection';

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
        fetchAreas();
    }, []);

    const fetchAreas = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/reservations/areas');
            const data = await response.json();
            if (response.ok) {
                setAreas(data.areas);
            }
        } catch (err) {
            console.error('Error fetching areas:', err);
        }
    };

    // Form state
    const [formData, setFormData] = useState({
        name: user?.user?.name || '',
        phone: user?.user?.phone || '',
        email: user?.user?.email || '',
        date: '',
        time: '',
        guests: '2',
        areaId: '',
        tableId: '',
        specialRequest: '',
    });

    const [areas, setAreas] = useState([]);

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
                    area_id: formData.areaId,
                    table_id: formData.tableId,
                    customer_name: formData.name,
                    mobile_number: formData.phone,
                    email: formData.email,
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
                    areaId: '',
                    tableId: '',
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
                            ✅ Reservation Successful! A confirmation email has been sent to your inbox.
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
                            {/* Name and Phone Row */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                        Full Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Your Name"
                                        className="input-glass w-full focus:ring-[#D4AF37]/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                                        Mobile Number <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="e.g. 0771234567"
                                        className="input-glass w-full focus:ring-[#D4AF37]/50"
                                        required
                                    />
                                </div>
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

                        {/* Area Selection */}
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300">
                                Select Dining Area <span className="text-red-400">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {areas.map(area => {
                                    const isSelected = formData.areaId === area.id;
                                    return (
                                        <button
                                            key={area.id}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, areaId: area.id, tableId: '' }))}
                                            className={`
                                                relative p-4 rounded-xl border transition-all duration-300
                                                flex flex-col items-center justify-center text-center gap-2
                                                ${isSelected 
                                                    ? 'border-[#D4AF37] bg-[#D4AF37]/20 ring-2 ring-[#D4AF37]/30 shadow-lg shadow-[#D4AF37]/10' 
                                                    : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}
                                            `}
                                        >
                                            <span className={`text-sm font-bold uppercase tracking-wider ${isSelected ? 'text-[#D4AF37]' : 'text-gray-300'}`}>
                                                {area.area_name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-[#D4AF37] rounded-full p-0.5 shadow-sm">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-black" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Table Layout Viewer */}
                        {formData.areaId && formData.date && formData.time && (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-300">
                                    Select Your Preferred Table <span className="text-red-400">*</span>
                                </label>
                                <TableSelection
                                    areaId={formData.areaId}
                                    date={formData.date}
                                    time={formData.time}
                                    selectedTableId={formData.tableId}
                                    onSelectTable={(table) => setFormData(prev => ({ ...prev, tableId: table.id }))}
                                />
                                {formData.tableId && (
                                    <p className="text-center text-[#D4AF37] font-semibold animate-pulse">
                                        Table selected successfully!
                                    </p>
                                )}
                            </div>
                        )}

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
