import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import config from '../config';
import { validateEmail, validatePassword, validatePhone } from '../utils/validation';

function Auth() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { setOrderType } = useCart();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
        otp: ''
    });

    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };



    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const showAlert = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    // Validations
    // Local helper to map utility response to showAlert
    const checkEmail = (email) => {
        const check = validateEmail(email);
        if (!check.isValid) showAlert('error', check.error);
        return check.isValid;
    };

    const checkPassword = (password) => {
        const check = validatePassword(password);
        if (!check.isValid) showAlert('error', check.error);
        return check.isValid;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        
        // If it looks like an email, validate it. Otherwise allow username.
        if (formData.email.includes('@')) {
            if (!checkEmail(formData.email)) return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${config.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, password: formData.password })
            });
            const data = await res.json();
            if (res.ok) {
                login(data);
                showAlert('success', 'Login successful!');
                
                const target = sessionStorage.getItem('postLoginTarget') || '/';
                const intendedType = sessionStorage.getItem('intendedOrderType');
                if (intendedType) setOrderType(intendedType);
                
                sessionStorage.removeItem('postLoginTarget');
                sessionStorage.removeItem('intendedOrderType');
                
                navigate(target);
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
        if (!validatePhone(formData.phone)) return showAlert('error', 'Invalid phone number (must be Sri Lankan format)');
        if (!checkEmail(formData.email)) return;
        if (!checkPassword(formData.password)) return;
        if (formData.password !== formData.confirmPassword) return showAlert('error', 'Passwords do not match');

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('name', formData.name);
            fd.append('email', formData.email);
            fd.append('phone', formData.phone);
            fd.append('password', formData.password);
            if (selectedFile) {
                fd.append('profile_image', selectedFile);
            }

            const res = await fetch(`${config.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                body: fd
            });
            const data = await res.json();
            if (res.ok) {
                showAlert('success', 'Registration successful! Automatically logging in...');
                login(data);
                
                const target = sessionStorage.getItem('postLoginTarget') || '/';
                const intendedType = sessionStorage.getItem('intendedOrderType');
                if (intendedType) setOrderType(intendedType);
                
                sessionStorage.removeItem('postLoginTarget');
                sessionStorage.removeItem('intendedOrderType');
                
                navigate(target);
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
        if (!checkEmail(formData.email)) return;

        setLoading(true);
        try {
            const res = await fetch(`${config.API_BASE_URL}/api/auth/forgot-password`, {
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
        if (!checkPassword(formData.password)) return;
        if (formData.password !== formData.confirmPassword) return showAlert('error', 'Passwords match fail');

        setLoading(true);
        try {
            const res = await fetch(`${config.API_BASE_URL}/api/auth/reset-password`, {
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
        <div className="min-h-[calc(100vh-80px)] flex items-start justify-center px-4 py-12 pt-[10vh]">
            <GlassCard className="w-full max-w-md">
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
                    <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-glass w-full" placeholder="Email Address" required autoComplete="off" />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-glass w-full" placeholder="Password" required autoComplete="new-password" />
                        <div className="text-right">
                            <button type="button" onClick={() => setMode('forgot')} className="text-sm text-[#D4AF37] hover:underline">Forgot Password?</button>
                        </div>
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
                    </form>
                )}

                {/* REGISTER */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4" autoComplete="off">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-glass w-full" placeholder="Full Name" required autoComplete="off" />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-glass w-full" placeholder="Phone Number" required autoComplete="off" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-glass w-full" placeholder="Email Address" required autoComplete="off" />
                        
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 pl-1 uppercase tracking-widest font-bold">Profile Image (Optional)</label>
                            <input 
                                type="file" 
                                name="profile_image_file" 
                                onChange={handleFileChange} 
                                className="input-glass w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#D4AF37]/20 file:text-[#D4AF37] hover:file:bg-[#D4AF37]/30" 
                                accept="image/*"
                            />
                        </div>

                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-glass w-full" placeholder="Password" required autoComplete="new-password" />
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-glass w-full" placeholder="Confirm Password" required autoComplete="new-password" />
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
                    </form>
                )}

                {/* FORGOT */}
                {mode === 'forgot' && (
                    <form onSubmit={handleForgot} className="space-y-4" autoComplete="off">
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-glass w-full" placeholder="Email Address" required autoComplete="off" />
                        <Button type="submit" className="w-full mt-4" disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP'}</Button>
                        <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-gray-400 hover:text-white mt-4">Back to Login</button>
                    </form>
                )}

                {/* RESET */}
                {mode === 'reset' && (
                    <form onSubmit={handleReset} className="space-y-4" autoComplete="off">
                        <input type="text" name="otp" value={formData.otp} onChange={handleChange} className="input-glass w-full" placeholder="6-Digit OTP" required autoComplete="off" />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-glass w-full" placeholder="New Password" required autoComplete="new-password" />
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-glass w-full" placeholder="Confirm New Password" required autoComplete="new-password" />
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
