/**
 * Main App Component
 * Routes & Layout Setup
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CustomerProvider, useCustomer } from './context/CustomerContext';

// Customer Pages
import CustomerAuth from './pages/CustomerAuth';
import StewardSelect from './pages/StewardSelect';
import MenuCategory from './pages/MenuCategory';
import MenuItems from './pages/MenuItems';
import Cart from './pages/Cart';
import PaymentSelection from './pages/PaymentSelection';
import CustomerMenu from './pages/CustomerMenu';
import CustomerDashboard from './pages/CustomerDashboard';
import Payments from './pages/Payments';
import Reservations from './pages/Reservations';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PortalSelection from './pages/PortalSelection';

// Staff Pages
import StaffLogin from './staff/pages/StaffLogin';
import StaffRegister from './staff/pages/StaffRegister';
import StaffForgotPassword from './staff/pages/StaffForgotPassword';
import StaffResetPassword from './staff/pages/StaffResetPassword';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

import UnifiedStaffDashboard from './staff/dashboards/UnifiedStaffDashboard';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

const CustomerLayout = ({ children, requireLogin = false }) => {
  const location = useLocation();
  const { isCustomerLoggedIn, selectedSteward } = useCustomer();

  // Root landing or steward select handling
  const isLandingPage = location.pathname === '/';
  const isStewardSelectPage = location.pathname === '/customer/select-steward' || isLandingPage;

  // 1. Login Protection
  if (requireLogin && !isCustomerLoggedIn) {
    return <Navigate to={`/customer/login?redirect=${encodeURIComponent(location.pathname)}`} />;
  }

  // 2. Page classification
  const isAuthPage = location.pathname.startsWith('/customer/log') ||
    location.pathname.startsWith('/customer/auth') ||
    location.pathname.startsWith('/customer/forgot') ||
    location.pathname.startsWith('/customer/reset');

  // 3. Steward Selection Protection (Must select steward before menu/cart/payments)
  const isStewardRequiredPage = location.pathname.startsWith('/customer/menu') ||
    location.pathname.startsWith('/customer/cart') ||
    location.pathname.startsWith('/customer/payment') ||
    location.pathname.startsWith('/customer/reservations');

  if (!selectedSteward && isStewardRequiredPage) {
    return <Navigate to="/" />;
  }

  // 4. UI Visibility Logic
  const isGuestMenuFlow = location.pathname.startsWith('/customer/menu-category') ||
    location.pathname.startsWith('/customer/menu-items') ||
    location.pathname.startsWith('/customer/cart') ||
    (location.pathname.startsWith('/customer/payment-selection') && !isCustomerLoggedIn);

  // Show Sidebar and BottomNav only on real "Dashboard" sections (after login)
  const showSidebar = isCustomerLoggedIn && !isStewardSelectPage && !isGuestMenuFlow;
  const showBottomNav = isCustomerLoggedIn && !isStewardSelectPage;

  // Header Mode Logic
  let headerMode = 'default';
  if (isStewardSelectPage) headerMode = 'steward';
  else if (isGuestMenuFlow) headerMode = 'menu';

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={isCustomerLoggedIn} userRole="customer" mode={headerMode} />
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 ${showSidebar ? 'md:ml-64' : ''}`}>
          {children}
        </main>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      {/* ========== ENTRY POINT (STEWARD LIST FIRST) ========== */}
      <Route path="/" element={
        <CustomerLayout>
          <StewardSelect />
        </CustomerLayout>
      } />

      {/* ========== CUSTOMER ROUTES ========== */}
      <Route path="/customer/auth" element={<CustomerAuth />} />
      <Route path="/customer/login" element={<CustomerAuth />} />
      <Route path="/customer/forgot-password" element={<ForgotPassword />} />
      <Route path="/customer/reset-password" element={<ResetPassword />} />

      {/* Legacy route kept for compatibility, now alias of / */}
      <Route path="/customer/select-steward" element={<Navigate to="/" />} />

      {/* Menu Category Flow (Guest Access) */}
      <Route path="/customer/menu-category" element={
        <CustomerLayout>
          <MenuCategory />
        </CustomerLayout>
      } />

      <Route path="/customer/menu-items/:category" element={
        <CustomerLayout>
          <MenuItems />
        </CustomerLayout>
      } />

      <Route path="/customer/cart" element={
        <CustomerLayout>
          <Cart />
        </CustomerLayout>
      } />

      <Route path="/customer/payment-selection" element={
        <CustomerLayout requireLogin={true}>
          <PaymentSelection />
        </CustomerLayout>
      } />

      {/* Dashboard Menu (Authenticated) */}
      <Route path="/customer/menu" element={
        <CustomerLayout requireLogin={true}>
          <CustomerMenu />
        </CustomerLayout>
      } />

      <Route path="/customer/dashboard" element={
        <CustomerLayout requireLogin={true}>
          <CustomerDashboard />
        </CustomerLayout>
      } />

      <Route path="/customer/payments" element={
        <CustomerLayout requireLogin={true}>
          <Payments />
        </CustomerLayout>
      } />

      <Route path="/customer/reservations" element={
        <CustomerLayout requireLogin={true}>
          <Reservations />
        </CustomerLayout>
      } />

      <Route path="/customer/settings" element={
        <CustomerLayout requireLogin={true}>
          <Settings />
        </CustomerLayout>
      } />

      {/* Optional: Accessibility for the old portal selection if needed at a specific URL */}
      <Route path="/portal" element={<PortalSelection />} />

      {/* ========== STAFF ROUTES ========== */}
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff/register" element={<StaffRegister />} />
      <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
      <Route path="/staff/reset-password" element={<StaffResetPassword />} />
      <Route path="/staff/dashboard" element={<UnifiedStaffDashboard />} />

      {/* ========== ADMIN ROUTES ========== */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <CustomerProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CustomerProvider>
  );
}

export default App;
