import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function Auth() {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Modes: 'login', 'register', 'forgot', 'reset'
    const [mode, setMode] = useState('login');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        otp: '',
        role: 'CUSTOMER', // Default
        jobRole: 'steward'
    });

    const roles = [
        { value: 'CUSTOMER', label: '👤 Customer / User' },
        { value: 'ADMIN', label: '🛡️ Administrator' },
        { value: 'MANAGER', label: '👔 Manager' },
        { value: 'CASHIER', label: '💰 Cashier' },
        { value: 'STEWARD', label: '🍽️ Steward / Waiter' },
        { value: 'KITCHEN_STAFF', label: '👨‍🍳 Kitchen Staff' },
        { value: 'BAR_STAFF', label: '🍸 Bar Staff' },
        { value: 'DELIVERY_RIDER', label: '🛵 Delivery Rider' },
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const showAlert = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    // Validations
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validatePhone = (phone) => /^(?:\+94|0)?7[0-9]{8}$/.test(phone);
    const validatePassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!validateEmail(formData.email)) return showAlert('error', 'Invalid email');

        setLoading(true);
        try {
            const res = await fetch('http://192.168.1.3:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password })
            });
            const data = await res.json();
            if (res.ok) {
                login(data);
                showAlert('success', 'Login successful!');
                navigate('/');
            } else {
                showAlert('error', data.message || 'Login failed');
            }
        } catch (err) {
            showAlert('error', 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!formData.name) return showAlert('error', 'Name is required');
        if (!validatePhone(formData.phone)) return showAlert('error', 'Invalid phone number');
        if (!validateEmail(formData.email)) return showAlert('error', 'Invalid email');
        if (!validatePassword(formData.password)) return showAlert('error', 'Password must be 8+ characters with uppercase, lowercase, number, and symbol');
        if (formData.password !== formData.confirmPassword) return showAlert('error', 'Passwords do not match');

        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                role: formData.role === 'CUSTOMER' ? 'CUSTOMER' : (formData.role === 'ADMIN' ? 'ADMIN' : 'STAFF'),
                jobRole: formData.role !== 'CUSTOMER' && formData.role !== 'ADMIN' ? formData.role.toLowerCase() : (formData.role === 'ADMIN' ? 'admin' : null)
            };

            const res = await fetch('http://192.168.1.3:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                const msg = formData.role === 'CUSTOMER' ? 'Registration successful! Please login.' : 'Staff registration successful! Wait for admin approval.';
                showAlert('success', msg);
                setMode('login');
            } else {
                showAlert('error', data.message || 'Registration failed');
            }
        } catch (err) {
            showAlert('error', 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        if (!validateEmail(formData.email)) return showAlert('error', 'Invalid email');

        setLoading(true);
        try {
            const res = await fetch('http://192.168.1.3:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('success', 'OTP sent to your email');
                setMode('reset');
            } else {
                showAlert('error', data.message || 'Failed to send OTP');
            }
        } catch (err) {
            showAlert('error', 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (!formData.otp) return showAlert('error', 'OTP is required');
        if (!validatePassword(formData.password)) return showAlert('error', 'Password too short');
        if (formData.password !== formData.confirmPassword) return showAlert('error', 'Passwords match fail');

        setLoading(true);
        try {
            const res = await fetch('http://192.168.1.3:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    otp: formData.otp,
                    newPassword: formData.password
                })
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('success', 'Password reset successful! Please login.');
                setMode('login');
            } else {
                showAlert('error', data.message || 'Reset failed');
            }
        } catch (err) {
            showAlert('error', 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
            <GlassCard className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'register' && 'Create Account'}
                        {mode === 'forgot' && 'Reset Password'}
                        {mode === 'reset' && 'Verify OTP'}
                    </h1>
                    <p className="text-gray-400">
                        {mode === 'login' && 'Login to access your account'}
                        {mode === 'register' && 'Register to get started with us'}
                        {mode === 'forgot' && 'Enter your email to receive an OTP'}
                        {mode === 'reset' && 'Enter the 6-digit code sent to your email'}
                    </p>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg text-sm text-center ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                {/* LOGIN */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-glass w-full" placeholder="Email Address" required />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-glass w-full" placeholder="Password" required />
                        <div className="text-right">
                            <button type="button" onClick={() => setMode('forgot')} className="text-sm text-[#D4AF37] hover:underline">Forgot Password?</button>
                        </div>
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
                    </form>
                )}

                {/* REGISTER */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-glass w-full" placeholder="Full Name" required />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-glass w-full" placeholder="Phone Number" required />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-glass w-full" placeholder="Email Address" required />
                        
                        <div className="relative">
                            <select 
                                name="role" 
                                value={formData.role} 
                                onChange={handleChange} 
                                className="input-glass w-full appearance-none cursor-pointer"
                            >
                                {roles.map(role => (
                                    <option key={role.value} value={role.value} className="bg-[#1a1a1a] text-white">
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                        </div>

                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-glass w-full" placeholder="Password" required />
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-glass w-full" placeholder="Confirm Password" required />
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
                    </form>
                )}

                {/* FORGOT */}
                {mode === 'forgot' && (
                    <form onSubmit={handleForgot} className="space-y-4">
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-glass w-full" placeholder="Email Address" required />
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP'}</Button>
                        <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-gray-400 hover:text-white mt-4">Back to Login</button>
                    </form>
                )}

                {/* RESET */}
                {mode === 'reset' && (
                    <form onSubmit={handleReset} className="space-y-4">
                        <input type="text" name="otp" value={formData.otp} onChange={handleChange} className="input-glass w-full" placeholder="6-Digit OTP" required />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-glass w-full" placeholder="New Password" required />
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-glass w-full" placeholder="Confirm New Password" required />
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</Button>
                        <button type="button" onClick={() => setMode('forgot')} className="w-full text-center text-sm text-gray-400 hover:text-white mt-4">Resend OTP</button>
                    </form>
                )}

                {/* Toggle */}
                {(mode === 'login' || mode === 'register') && (
                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#D4AF37] hover:underline font-medium">
                                {mode === 'login' ? 'Register' : 'Login'}
                            </button>
                        </p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}

export default Auth;
