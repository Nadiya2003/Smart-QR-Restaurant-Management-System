import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const StaffResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Missing reset token. Please request a new reset link.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://192.168.1.3:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Reset failed');
            }

            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/staff/login'), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                        Reset Password
                    </h1>
                    <p className="text-white/60">Create a new secure password</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
                                {message}
                            </div>
                        )}

                        <div>
                            <label className="block text-white/80 mb-2 font-medium">New Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                disabled={!token || !!message}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-white/80 mb-2 font-medium">Confirm Password</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                disabled={!token || !!message}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/50"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button type="submit" variant="primary" fullWidth disabled={loading || !token || !!message}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default StaffResetPassword;
