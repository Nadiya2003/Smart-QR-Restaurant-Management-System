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
function Header() {
    // State to manage mobile menu toggle
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    // Navigation links configuration
    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Menu', path: '/menu' },
        { name: 'Reservation', path: '/reservation' },
        { name: 'Delivery', path: '/delivery' },
        { name: 'AI Assistant', path: '/ai-chat' },
        { name: 'Login', path: '/auth' },
    ];

    // Check if a link is active
    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
            <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="text-2xl md:text-3xl font-bold">
                        <span className="bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text">
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
