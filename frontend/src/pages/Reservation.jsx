import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import TableSelection from '../components/TableSelection';
import config from '../config';

/**
 * Reservation Page - Table booking form
 * Allows users to reserve a table at the restaurant
 * Updated to GOLD theme + Backend Integration
 */
function Reservation() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchAreas();
    }, []);

    const fetchAreas = async () => {
        try {
            const response = await fetch(`${config.API_BASE_URL}/api/reservations/areas`);
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
        name: '',
        phone: '',
        email: '',
        date: '',
        time: '',
        guests: '2',
        areaId: '',
        tableId: '',
        tableCapacity: 0,
        specialRequest: '',
    });

    // Update form with user profile when authenticated
    useEffect(() => {
        if (isAuthenticated && user?.user) {
            setFormData(prev => ({
                ...prev,
                name: prev.name || user.user.name || '',
                phone: prev.phone || user.user.phone || '',
                email: prev.email || user.user.email || '',
            }));
        }
    }, [isAuthenticated, user]);

    // Check for pending reservation after login
    useEffect(() => {
        const pending = localStorage.getItem('pendingReservation');
        if (pending && isAuthenticated) {
            try {
                const parsed = JSON.parse(pending);
                setFormData(prev => ({ ...prev, ...parsed }));
                localStorage.removeItem('pendingReservation');
                setShowSuccess(false);
                setError('Welcome back! Your reservation details have been restored. You can now confirm your booking.');
                // Clear the info message after some time
                setTimeout(() => setError(''), 8000);
            } catch (err) {
                console.error('Failed to parse pending reservation:', err);
                localStorage.removeItem('pendingReservation');
            }
        }
    }, [isAuthenticated]);

    const [areas, setAreas] = useState([]);

    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // If date is picked but time is empty, set a default time to show tables
            if (name === 'date' && value && !prev.time) {
                updated.time = '18:00';
            }
            
            return updated;
        });
        setError('');
        setShowSuccess(false);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isAuthenticated) {
            // Save current form state to localStorage
            localStorage.setItem('pendingReservation', JSON.stringify(formData));
            // Set redirect target for after login
            localStorage.setItem('postLoginTarget', '/reservation');
            
            setError('Please login to complete your reservation. Redirecting...');
            setTimeout(() => navigate('/auth'), 1500);
            return;
        }

        // Validation
        if (!formData.name || !formData.date || !formData.time || !formData.phone) {
            setError('Please fill in all required fields');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (!formData.tableId) {
            setError('Please select a table');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Real-time Date and Time Validation
        if (formData.date < todayStr) {
            setError('Please select a valid future date.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (formData.date === todayStr) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const [selectedHour, selectedMinute] = formData.time.split(':').map(Number);

            if (selectedHour < currentHour || (selectedHour === currentHour && selectedMinute < currentMinute)) {
                setError('Please select a valid future time for today.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        }

        const guestCount = parseInt(formData.guests);
        if (formData.tableCapacity < guestCount) {
            setError(`Selected table does not have enough seats for ${guestCount} guests (Table capacity: ${formData.tableCapacity})`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${config.API_BASE_URL}/api/reservations`, {
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
                // Scroll to top to see message
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                setFormData({
                    ...formData,
                    date: '',
                    time: '',
                    guests: '2',
                    areaId: '',
                    tableId: '',
                    specialRequest: '',
                });
                // Keep the success message visible until user takes action or navigates
            } else if (response.status === 401) {
                // Token has expired or is invalid
                setError('Session expired. Please log in again. Redirecting...');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Clear old auth
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // Save current state
                localStorage.setItem('pendingReservation', JSON.stringify(formData));
                localStorage.setItem('postLoginTarget', '/reservation');
                
                setTimeout(() => {
                    window.location.href = '/auth';
                }, 2000);
            } else {
                setError(data.message || 'Failed to submit reservation');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Reservation error:', err);
            setError('Network error. Please try again later.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    <GlassCard className="mb-12 border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/20 to-black/40 p-10 text-center animate-fade-in shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden group">
                        {/* Decorative glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/20 blur-[100px] rounded-full group-hover:bg-[#D4AF37]/30 transition-all duration-700"></div>
                        
                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#D4AF37]/30 animate-bounce-subtle">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-serif text-white mb-4 tracking-tight">
                                Reservation <span className="text-[#D4AF37]">Successful!</span>
                            </h2>
                            
                            <p className="text-xl text-gray-300 mb-8 max-w-lg mx-auto leading-relaxed">
                                We're excited to host you! A <span className="text-[#D4AF37] font-bold">confirmation email</span> has been sent with all your details. 
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                                <Button 
                                    onClick={() => navigate('/account')} 
                                    className="bg-[#D4AF37] hover:bg-[#E6C86E] text-black font-black uppercase tracking-widest px-8 h-14 shadow-lg shadow-[#D4AF37]/20"
                                >
                                    My Dashboard
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowSuccess(false)} 
                                    className="border-white/20 text-white hover:bg-white/5 h-14 px-8 uppercase font-bold tracking-widest backdrop-blur-sm"
                                >
                                    New Reservation
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                )}

                {error && (
                    <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4 text-center animate-slide-up">
                        <p className="text-white font-medium">❌ {error}</p>
                    </div>
                )}

                {/* Reservation Form */}
                {!showSuccess && (
                <GlassCard className="animate-slide-up border-[#D4AF37]/20 shadow-xl shadow-[#D4AF37]/5">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name, Phone, and Email Row */}
                        <div className="grid md:grid-cols-3 gap-6">
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
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address (Optional)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    className="input-glass w-full focus:ring-[#D4AF37]/50"
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
                                    min={todayStr}
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
                        <div className="space-y-4 pt-4 border-t border-white/5">
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
                            <div className="space-y-4 pt-4 border-t border-white/5 animate-fade-in">
                                <label className="block text-sm font-medium text-gray-300">
                                    Select Your Preferred Table <span className="text-red-400">*</span>
                                </label>
                                <TableSelection
                                    areaId={formData.areaId}
                                    date={formData.date}
                                    time={formData.time}
                                    selectedTableId={formData.tableId}
                                    onSelectTable={(table) => setFormData(prev => ({ 
                                        ...prev, 
                                        tableId: table.id,
                                        tableCapacity: table.capacity 
                                    }))}
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
                            {loading ? 'Processing...' : isAuthenticated ? 'Confirm Reservation' : 'Login to Confirm Registration'}
                        </Button>
                    </form>
                </GlassCard>
                )}

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
