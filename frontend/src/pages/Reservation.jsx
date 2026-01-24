import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

/**
 * Reservation Page - Table booking form
 * Allows users to reserve a table at the restaurant
 * Updated to GOLD theme
 */
function Reservation() {
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        date: '',
        time: '',
        guests: '2',
    });

    // Success message state
    const [showSuccess, setShowSuccess] = useState(false);

    // Handle input changes
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.phone || !formData.date || !formData.time) {
            alert('Please fill in all fields');
            return;
        }

        // Show success message (UI only - no backend)
        setShowSuccess(true);

        // Reset form
        setFormData({
            name: '',
            phone: '',
            date: '',
            time: '',
            guests: '2',
        });

        // Hide success message after 5 seconds
        setTimeout(() => {
            setShowSuccess(false);
        }, 5000);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-12">
            <div className="container mx-auto max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Reserve Your Table
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Book a table at Melissas Food Court for an unforgettable dining experience
                    </p>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="mb-6 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-xl p-4 text-center animate-slide-up">
                        <p className="text-white font-medium">
                            ✅ Reservation confirmed! We look forward to serving you.
                        </p>
                    </div>
                )}

                {/* Reservation Form */}
                <GlassCard className="animate-slide-up">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Input */}
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
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="e.g., Kasun Perera"
                                required
                            />
                        </div>

                        {/* Phone Input */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                                Phone Number <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="e.g., 077 123 4567"
                                required
                            />
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
                                <option value="9+">9+ Guests</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <Button type="submit" className="w-full" size="lg">
                            Confirm Reservation
                        </Button>
                    </form>
                </GlassCard>

                {/* Info Section */}
                <div className="mt-8 text-center">
                    <p className="text-gray-400">
                        For large groups (9+ guests) or special arrangements,
                        please call us at{' '}
                        <span className="text-[#D4AF37] font-medium">+94 77 123 4567</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Reservation;
