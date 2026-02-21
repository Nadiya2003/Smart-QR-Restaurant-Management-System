import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const StaffForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Validation for Strong Password
    const validatePassword = (pass) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return regex.test(pass);
    };

    // Step 1: Send OTP
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setMessage(data.message);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setMessage('OTP Verified. Please set a new password.');
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!validatePassword(newPassword)) {
            setError('Password must contain at least 8 characters, including uppercase, lowercase, number, and symbol.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/staff/login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                        Reset Staff Password
                    </h1>
                    <p className="text-white/60">
                        {step === 1 && 'Enter your email to receive an OTP'}
                        {step === 2 && 'Enter the 6-digit OTP sent to your email'}
                        {step === 3 && 'Create a new strong password'}
                    </p>
                </div>

                <GlassCard>
                    {error && <div className="mb-4 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
                    {message && <div className="mb-4 text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20">{message}</div>}

                    {step === 1 && (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50"
                                    placeholder="staff@restaurant.com"
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" variant="primary" fullWidth disabled={loading}>
                                {loading ? 'Sending OTP...' : 'Send OTP'}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">Enter OTP</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50 text-center text-2xl tracking-[0.5em]"
                                    placeholder="000000"
                                    autoFocus
                                />
                            </div>
                            <Button type="submit" variant="primary" fullWidth disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </Button>
                            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-white mt-2">Change Email</button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50"
                                    placeholder="••••••••"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-400 mt-1">Min 8 chars, 1 uppercase, 1 number, 1 symbol</p>
                            </div>
                            <div>
                                <label className="block text-white/80 mb-2 font-medium">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50"
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button type="submit" variant="primary" fullWidth disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </form>
                    )}

                    <div className="text-center mt-6 pt-4 border-t border-white/10">
                        <button type="button" onClick={() => navigate('/staff/login')} className="text-[#FFD700] hover:text-[#FFA500] text-sm font-medium">
                            Back to Login
                        </button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default StaffForgotPassword;
