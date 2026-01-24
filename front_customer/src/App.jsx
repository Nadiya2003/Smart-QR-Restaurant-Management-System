/**
 * Main App Component
 * Routes & Layout Setup
 * Routing Flow:
 * 1. / (RoleSelect) - Choose Customer or Staff
 * 2. /customer/auth (CustomerAuth) - Login/Register
 * 3. /customer/select-steward (StewardSelect) - MANDATORY steward selection
 * 4. /customer/menu, dashboard, etc - Main portal
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages
import RoleSelect from './pages/RoleSelect';
import CustomerAuth from './pages/CustomerAuth';
import StewardSelect from './pages/StewardSelect';
import CustomerMenu from './pages/CustomerMenu';
import CustomerDashboard from './pages/CustomerDashboard';
import Payments from './pages/Payments';
import Reservations from './pages/Reservations';
import Settings from './pages/Settings';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

function App() {
  // Check if customer is logged in
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  const [selectedSteward, setSelectedSteward] = useState(null);

  // Check localStorage on mount
  useEffect(() => {
    const auth = localStorage.getItem('customerAuth');
    if (auth) {
      setIsCustomerLoggedIn(true);
    }
    const steward = localStorage.getItem('selectedSteward');
    if (steward) {
      setSelectedSteward(JSON.parse(steward));
    }
  }, []);

  // Customer Pages with Layout (Header + Sidebar/BottomNav)
  const CustomerLayout = ({ children }) => (
    <>
      <Header isLoggedIn={true} userRole="customer" />
      <Sidebar />
      <BottomNav />
      {children}
    </>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* ========== ENTRY POINT ========== */}
        <Route path="/" element={<RoleSelect />} />

        {/* ========== CUSTOMER ROUTES ========== */}

        {/* Authentication */}
        <Route path="/customer/auth" element={<CustomerAuth />} />

        {/* Steward Selection (MANDATORY - must select before accessing menu) */}
        <Route path="/customer/select-steward" element={<StewardSelect />} />

        {/* Main Customer Portal - Protected Routes */}
        <Route
          path="/customer/menu"
          element={
            isCustomerLoggedIn ? (
              <CustomerLayout>
                <CustomerMenu />
              </CustomerLayout>
            ) : (
              <Navigate to="/customer/auth" />
            )
          }
        />

        <Route
          path="/customer/dashboard"
          element={
            isCustomerLoggedIn ? (
              <CustomerLayout>
                <CustomerDashboard />
              </CustomerLayout>
            ) : (
              <Navigate to="/customer/auth" />
            )
          }
        />

        <Route
          path="/customer/payments"
          element={
            isCustomerLoggedIn ? (
              <CustomerLayout>
                <Payments />
              </CustomerLayout>
            ) : (
              <Navigate to="/customer/auth" />
            )
          }
        />

        <Route
          path="/customer/reservations"
          element={
            isCustomerLoggedIn ? (
              <CustomerLayout>
                <Reservations />
              </CustomerLayout>
            ) : (
              <Navigate to="/customer/auth" />
            )
          }
        />

        <Route
          path="/customer/settings"
          element={
            isCustomerLoggedIn ? (
              <CustomerLayout>
                <Settings />
              </CustomerLayout>
            ) : (
              <Navigate to="/customer/auth" />
            )
          }
        />

        {/* ========== STAFF ROUTES ========== */}
        <Route path="/staff/login" element={<StaffLogin />} />

        <Route
          path="/staff/dashboard"
          element={
            localStorage.getItem('staffAuth') ? (
              <StaffDashboard />
            ) : (
              <Navigate to="/staff/login" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
