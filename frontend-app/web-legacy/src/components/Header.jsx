import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Header Component - Sticky navigation with glassmorphism
 * Features:
 * - Responsive mobile menu with hamburger toggle
 * - Glassmorphism effect with backdrop blur
 * - Active link highlighting in GOLD
 * - Smooth animations
 */
import { useAuth } from '../context/AuthContext';

function Header() {
    const { user, logout, isAuthenticated } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    // Navigation links configuration
    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Menu', path: '/menu' },
        { name: 'Reservation', path: '/reservation' },
        { name: 'Delivery', path: '/delivery' },
        { name: 'AI Assistant', path: '/ai-chat' },
    ];

    if (!isAuthenticated) {
        navLinks.push({ name: 'Login', path: '/auth' });
    }

    // Check if a link is active
    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
            <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img
                            src="/logo.png"
                            alt="Melissas Food Court Logo"
                            className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="hidden sm:block bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text text-xl md:text-2xl font-bold">
                            Melissas Food Court
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-medium transition-all duration-300 hover:text-[#D4AF37] ${isActive(link.path) ? 'text-[#D4AF37]' : 'text-gray-300'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                        {isAuthenticated && (
                            <>
                                <Link
                                    to="/account"
                                    className={`text-sm font-medium transition-all duration-300 hover:text-[#D4AF37] ${isActive('/account') ? 'text-[#D4AF37]' : 'text-gray-300'}`}
                                >
                                    Account
                                </Link>
                                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                                    <span className="text-sm text-gray-400">Hi, {user.user.name.split(' ')[0]}</span>
                                    <button
                                        onClick={logout}
                                        className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:text-white transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden text-white p-2"
                        aria-label="Toggle menu"
                    >
                        {/* Hamburger Icon */}
                        <div className="w-6 h-5 flex flex-col justify-between">
                            <span
                                className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''
                                    }`}
                            ></span>
                            <span
                                className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''
                                    }`}
                            ></span>
                            <span
                                className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''
                                    }`}
                            ></span>
                        </div>
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 animate-slide-up">
                        <div className="flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`text-base font-medium transition-all duration-300 hover:text-[#D4AF37] ${isActive(link.path) ? 'text-[#D4AF37]' : 'text-gray-300'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}

export default Header;
