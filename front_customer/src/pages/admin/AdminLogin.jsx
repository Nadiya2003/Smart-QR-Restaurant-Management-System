
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/GlassCard';
import Button from '../../components/Button';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Admin is a staff user with role = 'ADMIN'
            const response = await fetch('http://localhost:5000/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: username, // In this case 'username' input will take email
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user.role === 'ADMIN') {
                    localStorage.setItem('adminToken', data.token);
                    navigate('/admin/dashboard');
                } else {
                    setError('Not an admin account');
                }
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            setError('Network error');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <GlassCard className="max-w-md w-full p-8 border-gold-500/50">
                <h1 className="text-3xl font-bold text-center text-gold-500 mb-6 font-mono">
                    SYSTEM ADMIN
                </h1>

                {error && (
                    <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-gray-400 font-mono text-xs">USERNAME</label>
                        <input
                            type="text"
                            className="w-full bg-black border border-gray-700 text-white p-2 rounded focus:border-gold-500 focus:outline-none font-mono"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-gray-400 font-mono text-xs">PASSWORD</label>
                        <input
                            type="password"
                            className="w-full bg-black border border-gray-700 text-white p-2 rounded focus:border-gold-500 focus:outline-none font-mono"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" className="w-full mt-4 rounded-none font-mono">
                        ACCESS TERMINAL
                    </Button>
                </form>
            </GlassCard>
        </div>
    );
};

export default AdminLogin;
