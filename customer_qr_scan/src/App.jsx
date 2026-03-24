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
  const [pageData, setPageData] = useState(null);
  const [currentPage, setCurrentPage] = useState('welcome');

  const navigate = (page, data = null) => {
    setPageData(data);
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderPage = () => {
    const commonProps = { onNavigate: navigate, data: pageData };
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage {...commonProps} />;
      case 'steward':
        return <StewardSelectionPage {...commonProps} />;
      case 'menu':
        return <MenuPage {...commonProps} />;
      case 'cart':
        return <CartPage {...commonProps} />;
      case 'tracking':
        return <OrderTrackingPage {...commonProps} />;
      case 'payment':
        return <PaymentPage {...commonProps} />;
      case 'login':
        return <LoginPage {...commonProps} />;
      case 'register':
        return <RegisterPage {...commonProps} />;
      case 'dashboard':
        return <DashboardPage {...commonProps} />;
      case 'history':
        return <OrderHistoryPage {...commonProps} />;
      case 'feedback':
        return <FeedbackPage {...commonProps} />;
      case 'table-selection':
        return <TableSelectionPage {...commonProps} />;
      case 'change-table':
        return <TableSelectionPage {...commonProps} isChangingTable={true} />;
      case 'auth-selection':
        return <AuthSelectionPage {...commonProps} />;
      case 'rewards':
        return <RewardsPage {...commonProps} />;
      case 'settings':
        return <SettingsPage {...commonProps} />;
      default:
        return <WelcomePage {...commonProps} />;
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
