import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from '../context/CustomerContext';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import config from '../config';

function CustomerAuth() {
  const navigate = useNavigate();
  const { refreshAuth } = useCustomer();

  const [isLogin, setIsLogin] = useState(true);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Validation Helpers
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^(?:\+94|0)?7[0-9]{8}$/.test(phone);
  const validatePassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(loginEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('customerAuth', JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          token: data.token,
          permissions: data.user.permissions // Store permissions
        }));

        refreshAuth();

        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        navigate(redirect || '/customer/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    }
  };

  const [registerRole, setRegisterRole] = useState('CUSTOMER');
  
  const roles = [
    { value: 'CUSTOMER', label: '👤 Customer / User' },
    { value: 'ADMIN', label: '🛡️ Administrator' },
    { value: 'MANAGER', label: '👔 Manager' },
    { value: 'CASHIER', label: '💰 Cashier' },
    { value: 'STEWARD', label: '🍽️ Steward / Waiter' },
    { value: 'INVENTORY_MANAGER', label: '📦 Inventory Manager' },
    { value: 'SUPPLIER', label: '🚚 Supplier' },
    { value: 'KITCHEN_STAFF', label: '👨‍🍳 Kitchen Staff' },
    { value: 'BAR_STAFF', label: '🍸 Bar Staff' },
    { value: 'DELIVERY_RIDER', label: '🛵 Delivery Rider' },
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!registerName || !registerPhone || !registerEmail || !registerPassword || !registerConfirmPassword) {
      setError('All fields are required');
      return;
    }

    if (registerName.length < 3) {
      setError('Name must be at least 3 characters long');
      return;
    }

    if (!validatePhone(registerPhone)) {
      setError('Please enter a valid Sri Lankan phone number (e.g., 0712345678)');
      return;
    }

    if (!validateEmail(registerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(registerPassword)) {
      setError('Password must contain at least 8 characters, including uppercase, lowercase, number, and symbol.');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const payload = {
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        password: registerPassword,
        role: registerRole === 'CUSTOMER' ? 'CUSTOMER' : (registerRole === 'ADMIN' ? 'ADMIN' : 'STAFF'),
        jobRole: registerRole !== 'CUSTOMER' && registerRole !== 'ADMIN' ? registerRole.toLowerCase() : (registerRole === 'ADMIN' ? 'admin' : null)
      };

      const response = await fetch(`${config.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(registerRole === 'CUSTOMER' ? 'Registration successful! Please login.' : 'Staff registration successful! Wait for admin approval.');
        setIsLogin(true); // Switch to login view
        setLoginEmail(registerEmail);
        // Reset fields
        setRegisterName('');
        setRegisterPhone('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Melissa's Food Court Logo"
            className="h-24 w-auto mx-auto mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] object-contain"
          />
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">Melissa's Food Court</span>
          </h1>
          <p className="text-gray-400">{isLogin ? 'Welcome back' : 'Create your account'}</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-2 rounded text-sm text-center">
            {success}
          </div>
        )}

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
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/customer/forgot-password')}
                  className="text-xs text-[#D4AF37] hover:text-[#E6C86E]"
                >
                  Forgot Password?
                </button>
              </div>
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

            <div className="relative">
              <label className="block text-sm font-medium mb-2">Select Role</label>
              <select 
                value={registerRole} 
                onChange={(e) => setRegisterRole(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37] text-sm appearance-none cursor-pointer"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value} className="bg-[#1a1a1a] text-white">
                    {role.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-[38px] pointer-events-none text-gray-500 text-xs">▼</div>
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
