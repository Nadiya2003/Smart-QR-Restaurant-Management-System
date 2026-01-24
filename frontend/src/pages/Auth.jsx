import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

/**
 * Auth Page - Combined Login and Register in a single page
 * Features:
 * - Toggle between login and register modes
 * - Form validation
 * - Glassmorphism design with GOLD accents
 * 
 * IMPORTANT: This is a UI-only implementation with no backend
 */
function Auth() {
    // State to toggle between 'login' and 'register' modes
    const [mode, setMode] = useState('login'); // default: login

    // Form data state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // Handle input changes
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Handle login form submission
    const handleLogin = (e) => {
        e.preventDefault();

        // Basic validation for login
        if (!formData.email || !formData.password) {
            alert('Please fill in all fields');
            return;
        }

        // Mock login (UI only - no backend)
        alert(`Login successful!\nEmail: ${formData.email}`);

        // Reset form
        setFormData({ ...formData, email: '', password: '' });
    };

    // Handle register form submission
    const handleRegister = (e) => {
        e.preventDefault();

        // Validation for registration
        if (!formData.name || !formData.phone || !formData.email || !formData.password || !formData.confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        // Mock registration (UI only - no backend)
        alert(`Registration successful!\nName: ${formData.name}\nEmail: ${formData.email}`);

        // Reset form and switch to login
        setFormData({
            name: '',
            phone: '',
            email: '',
            password: '',
            confirmPassword: '',
        });
        setMode('login');
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
            <GlassCard className="w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-gray-400">
                        {mode === 'login'
                            ? 'Login to access your account'
                            : 'Register to get started with us'}
                    </p>
                </div>

                {/* LOGIN FORM */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {/* Login Button */}
                        <Button type="submit" className="w-full mt-6">
                            Login
                        </Button>
                    </form>
                )}

                {/* REGISTER FORM */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Name Input */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                Full Name
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
                                Phone Number
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

                        {/* Email Input */}
                        <div>
                            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="reg-email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="reg-password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="Create a password"
                                required
                            />
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input-glass w-full focus:ring-[#D4AF37]/50"
                                placeholder="Confirm your password"
                                required
                            />
                        </div>

                        {/* Register Button */}
                        <Button type="submit" className="w-full mt-6">
                            Create Account
                        </Button>
                    </form>
                )}

                {/* Toggle between Login and Register */}
                <div className="mt-6 text-center">
                    {mode === 'login' ? (
                        <p className="text-gray-400">
                            Don&apos;t have an account?{' '}
                            <button
                                onClick={() => setMode('register')}
                                className="text-[#D4AF37] hover:text-[#E6C86E] font-medium transition-colors duration-200"
                            >
                                Register
                            </button>
                        </p>
                    ) : (
                        <p className="text-gray-400">
                            Already have an account?{' '}
                            <button
                                onClick={() => setMode('login')}
                                className="text-[#D4AF37] hover:text-[#E6C86E] font-medium transition-colors duration-200"
                            >
                                Login
                            </button>
                        </p>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

export default Auth;
