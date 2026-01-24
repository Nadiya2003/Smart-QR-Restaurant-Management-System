import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function CustomerAuth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const sriLankanNames = ['Kasun', 'Nimal', 'Saman', 'Dilani', 'Tharindu', 'Isuru'];

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      const authData = {
        name: sriLankanNames[Math.floor(Math.random() * sriLankanNames.length)],
        email: loginEmail,
        phone: '+94' + Math.floor(Math.random() * 900000000 + 100000000),
        id: Math.random().toString(36).substr(2, 9),
      };
      localStorage.setItem('customerAuth', JSON.stringify(authData));
      navigate('/customer/select-steward');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (
      registerName &&
      registerPhone &&
      registerEmail &&
      registerPassword &&
      registerPassword === registerConfirmPassword
    ) {
      const authData = {
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        id: Math.random().toString(36).substr(2, 9),
      };
      localStorage.setItem('customerAuth', JSON.stringify(authData));
      navigate('/customer/select-steward');
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#D4AF37]">Melissa's</span> Food Court
          </h1>
          <p className="text-gray-400">{isLogin ? 'Welcome back' : 'Create your account'}</p>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#D4AF37] transition text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#D4AF37] transition text-white placeholder:text-gray-500"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Login
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] text-sm placeholder:text-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                placeholder="+94 xxxxxxxxx"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] text-sm placeholder:text-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] text-sm placeholder:text-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] text-sm placeholder:text-gray-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] text-sm placeholder:text-gray-500"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2">
              Create Account
            </Button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-[#D4AF37] hover:text-[#E6C86E] font-semibold transition"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-[#D4AF37] hover:text-[#E6C86E] font-semibold transition"
              >
                Login
              </button>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export default CustomerAuth;
