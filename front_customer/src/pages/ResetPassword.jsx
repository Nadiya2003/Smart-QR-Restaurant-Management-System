import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) setError('Invalid refresh link.');
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://192.168.1.3:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: formData.password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Reset failed');

            setMessage('Password updated! Redirecting...');
            setTimeout(() => navigate('/customer/login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-gradient px-4 py-8 flex items-center justify-center">
            <div className="w-full max-w-md">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-2">Reset Password</h1>
                    <p className="text-gray-400">Choose a new password</p>
                </div>

                <GlassCard>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
                        {message && <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20">{message}</div>}

                        <div>
                            <label className="block text-gray-300 mb-2">New Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-gold-500/50 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-gold-500/50 outline-none"
                            />
                        </div>

                        <Button type="submit" fullWidth disabled={loading || !token}>
                            {loading ? 'Updating...' : 'Reset Password'}
                        </Button>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default ResetPassword;
