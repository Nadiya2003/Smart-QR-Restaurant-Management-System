import React, { useState } from 'react';
import { CartProvider } from './hooks/useCart.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { OrderProvider } from './hooks/useOrder.jsx';

// Pages
import { WelcomePage } from './pages/WelcomePage.jsx';
import { StewardSelectionPage } from './pages/StewardSelectionPage.jsx';
import { MenuPage } from './pages/MenuPage.jsx';
import { CartPage } from './pages/CartPage.jsx';
import { OrderTrackingPage } from './pages/OrderTrackingPage.jsx';
import { PaymentPage } from './pages/PaymentPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { OrderHistoryPage } from './pages/OrderHistoryPage.jsx';
import { FeedbackPage } from './pages/FeedbackPage.jsx';
import { TableSelectionPage } from './pages/TableSelectionPage.jsx';
import { AuthSelectionPage } from './pages/AuthSelectionPage.jsx';
import { RewardsPage } from './pages/RewardsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';


function AppContent() {
  const [currentPage, setCurrentPage] = useState('welcome');

  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onNavigate={navigate} />;
      case 'steward':
        return <StewardSelectionPage onNavigate={navigate} />;
      case 'menu':
        return <MenuPage onNavigate={navigate} />;
      case 'cart':
        return <CartPage onNavigate={navigate} />;
      case 'tracking':
        return <OrderTrackingPage onNavigate={navigate} />;
      case 'payment':
        return <PaymentPage onNavigate={navigate} />;
      case 'login':
        return <LoginPage onNavigate={navigate} />;
      case 'register':
        return <RegisterPage onNavigate={navigate} />;
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'history':
        return <OrderHistoryPage onNavigate={navigate} />;
      case 'feedback':
        return <FeedbackPage onNavigate={navigate} />;
      case 'table-selection':
        return <TableSelectionPage onNavigate={navigate} />;
      case 'change-table':
        return <TableSelectionPage onNavigate={navigate} isChangingTable={true} />;
      case 'auth-selection':
        return <AuthSelectionPage onNavigate={navigate} />;
      case 'rewards':
        return <RewardsPage onNavigate={navigate} />;
      case 'settings':
        return <SettingsPage onNavigate={navigate} />;
      default:
        return <WelcomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-lg overflow-x-hidden">
        {renderPage()}
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </OrderProvider>
    </AuthProvider>
  );
}
