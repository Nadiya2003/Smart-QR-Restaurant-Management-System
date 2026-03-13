import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

/**
 * StaffLogin - Login page for staff members
 * Automatically detects role and redirects to appropriate dashboard
 */
const StaffLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://192.168.1.3:5000/api/staff/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store token and user data
            localStorage.setItem('staffToken', data.token);
            localStorage.setItem('staffUser', JSON.stringify(data.user));

            // Redirect to Unified Dashboard
            navigate('/staff/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFA500]/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <img
                        src="/logo.png"
                        alt="Melissa's Food Court Logo"
                        className="h-24 w-auto mx-auto mb-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] object-contain"
                    />
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
                        Staff Portal
                    </h1>
                    <p className="text-white/60">Sign in to your dashboard</p>
                </div>

                {/* Login Form */}
                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-white/80 mb-2 font-medium">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                          placeholder-white/40 focus:bg-white/10 focus:border-[#FFD700]/50 
                          focus:outline-none transition-all"
                                placeholder="staff@restaurant.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="block text-white/80 font-medium">Password</label>
                                <button
                                    type="button"
                                    onClick={() => navigate('/staff/forgot-password')}
                                    className="text-[#FFD700] hover:text-[#FFA500] text-xs font-medium transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                          placeholder-white/40 focus:bg-white/10 focus:border-[#FFD700]/50 
                          focus:outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            disabled={loading}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>

                        {/* Register Link */}
                        <div className="text-center pt-4 border-t border-white/10">
                            <p className="text-white/60 text-sm">
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate('/staff/register')}
                                    className="text-[#FFD700] hover:text-[#FFA500] transition-colors font-medium"
                                >
                                    Register Here
                                </button>
                            </p>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default StaffLogin;
