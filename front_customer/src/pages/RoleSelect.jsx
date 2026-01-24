/**
 * Role Selection Page
 * First page user sees
 * Choose between Customer Portal or Staff Portal
 * Route: /
 */

import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gold-500">Melissa's</span> Food Court
          </h1>
          <p className="text-gray-400 text-lg">Select your portal to continue</p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Customer Portal Card */}
          <GlassCard className="p-8 cursor-pointer group hover:shadow-glow-lg transition-smooth">
            <div onClick={() => navigate('/customer/auth')} className="text-center space-y-6">
              <div className="text-6xl">👨‍💼</div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Customer Portal</h2>
                <p className="text-gray-400 text-sm">
                  Order food, track orders, manage reservations, and more
                </p>
              </div>
              <div className="pt-4">
                <Button className="w-full">
                  Enter as Customer
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Enjoy our Sri Lankan and Italian cuisine
              </p>
            </div>
          </GlassCard>

          {/* Staff Portal Card */}
          <GlassCard className="p-8 cursor-pointer group hover:shadow-glow-lg transition-smooth">
            <div onClick={() => navigate('/staff/login')} className="text-center space-y-6">
              <div className="text-6xl">👨‍🍳</div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Staff Portal</h2>
                <p className="text-gray-400 text-sm">
                  Manage orders and serve customers efficiently
                </p>
              </div>
              <div className="pt-4">
                <Button className="w-full">
                  Enter as Staff
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Steward dashboard access
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-xs text-gray-600">
            © 2025 Melissa's Food Court. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoleSelect;
