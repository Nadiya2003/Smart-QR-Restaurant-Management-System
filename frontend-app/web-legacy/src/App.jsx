import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Reservation from './pages/Reservation';
import Delivery from './pages/Delivery';
import AIChat from './pages/AIChat';
import Auth from './pages/Auth';
import Account from './pages/Account';

/**
 * App Component - Main application component
 * Handles routing and layout
 */
function App() {
  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#060606] via-[#0b0b10] to-[#101018]">
      {/* Global Sticky Header */}
      <Header />

      {/* Main Content Area */}
      <main className="pb-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-400 text-sm">
        <div className="container mx-auto px-4">
          <p>© 2024 Melissas Food Court. All rights reserved.</p>
          <p className="mt-2">Premium Sri Lankan & Italian Cuisine</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
