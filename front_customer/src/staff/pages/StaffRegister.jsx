import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const ROLES = [
    { value: 'manager', label: '👔 Manager', color: 'text-purple-400' },
    { value: 'cashier', label: '💰 Cashier', color: 'text-green-400' },
    { value: 'steward', label: '🪑 Steward', color: 'text-blue-400' },
    { value: 'delivery_rider', label: '🏍️ Delivery Rider', color: 'text-orange-400' },
    { value: 'inventory_manager', label: '📦 Inventory Manager', color: 'text-yellow-400' },
    { value: 'supplier', label: '🚚 Supplier', color: 'text-cyan-400' },
    { value: 'kitchen_staff', label: '👨‍🍳 Kitchen Staff', color: 'text-red-400' },
    { value: 'bar_staff', label: '🍹 Bar Staff', color: 'text-pink-400' },
];

/**
 * StaffRegister - Registration page for new staff members
 * Includes role selection dropdown with all 8 roles
 */
const StaffRegister = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Clean up timeout on unmount
    useEffect(() => {
        let timeoutId;
        if (successMessage) {
            timeoutId = setTimeout(() => {
                navigate('/staff/login');
            }, 3500);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [successMessage, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (error) setError('');
        if (successMessage) setSuccessMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        
        setLoading(true);
        setError('');
        setSuccessMessage('');

        // Validation
        if (!formData.name || !formData.email || !formData.password || !formData.role) {
            setError('All fields are required');
            setLoading(false);
            return;
        }

        if (formData.name.length < 3) {
            setError('Name must be at least 3 characters long');
            setLoading(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            setError('Password must contain at least 8 characters, including uppercase, lowercase, number, and symbol.');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://192.168.1.3:5000/api/staff/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    full_name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            setSuccessMessage('Registration successful! Please wait for Admin to activate your account.');
        } catch (err) {
            setError(err.message);
            setLoading(false);
        } finally {
            // Loading is set to false in catch/success paths to be precise
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFA500]/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <img
                        id="staff-register-logo"
                        src="/logo.png"
                        alt="Melissa's Food Court Logo"
                        className="h-24 w-auto mx-auto mb-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] object-contain"
                    />
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
                        Join Our Team
                    </h1>
                    <p className="text-white/60">Create your staff account</p>
                </div>

                {/* Register Form */}
                <GlassCard>
                    <form id="staff-register-form" onSubmit={handleSubmit} className="space-y-5">
                        {/* Success Message */}
                        {successMessage && (
                            <div id="register-success-msg" className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm font-medium">
                                {successMessage}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div id="register-error-msg" className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Name Field */}
                        <div>
                            <label htmlFor="staff-name" className="block text-white/80 mb-2 font-medium">Name</label>
                            <input
                                id="staff-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:bg-white/10 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                                placeholder="John Doe"
                                autoComplete="name"
                            />
                        </div>

                        {/* Email Field */}
                        <div>
                            <label htmlFor="staff-email" className="block text-white/80 mb-2 font-medium">Email</label>
                            <input
                                id="staff-email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:bg-white/10 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                                placeholder="staff@restaurant.com"
                                autoComplete="email"
                            />
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label htmlFor="staff-role" className="block text-white/80 mb-2 font-medium">Role</label>
                            <div className="relative">
                                <select
                                    id="staff-role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-[#FFD700]/50 focus:outline-none transition-all appearance-none cursor-pointer"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFD700%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%22.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 1rem center',
                                        backgroundSize: '0.8em',
                                        paddingRight: '2.5rem'
                                    }}
                                >
                                    <option value="" className="bg-[#1a1a1a] text-white/50">Select your role...</option>
                                    {ROLES.map((role) => (
                                        <option key={role.value} value={role.value} className="bg-[#1a1a1a] text-white">
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="staff-password" className="block text-white/80 mb-2 font-medium">Password</label>
                            <input
                                id="staff-password"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:bg-white/10 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="staff-confirm-password" className="block text-white/80 mb-2 font-medium">Confirm Password</label>
                            <input
                                id="staff-confirm-password"
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:bg-white/10 focus:border-[#FFD700]/50 focus:outline-none transition-all"
                                placeholder="••••••••"
                                autoComplete="new-password"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            id="staff-register-submit"
                            type="submit"
                            variant="primary"
                            fullWidth
                            disabled={loading}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>

                        {/* Login Link */}
                        <div className="text-center pt-4 border-t border-white/10">
                            <p className="text-white/60 text-sm">
                                Already have an account?{' '}
                                <button
                                    id="staff-register-to-login"
                                    type="button"
                                    onClick={() => navigate('/staff/login')}
                                    className="text-[#FFD700] hover:text-[#FFA500] transition-colors font-medium"
                                >
                                    Sign In
                                </button>
                            </p>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default StaffRegister;
