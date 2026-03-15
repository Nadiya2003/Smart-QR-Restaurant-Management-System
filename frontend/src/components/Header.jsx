import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SafeImage from './SafeImage';
import AccountAvatar from '../assets/default-customer-avatar.png';
import config from '../config';

function Header() {
    const { user, logout, isAuthenticated } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const [activeSection, setActiveSection] = useState('home');

    useEffect(() => {
        const handleScroll = () => {
            if (location.pathname !== '/') return;
            
            const sections = ['home', 'about', 'gallery', 'ai-assistant', 'faq'];
            const scrollPos = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const offset = element.offsetTop;
                    const height = element.offsetHeight;
                    if (scrollPos >= offset && scrollPos < offset + height) {
                        setActiveSection(section);
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [location.pathname]);

    // Navigation links configuration
    const navLinks = [
        { name: 'Home', path: '/', isScroll: true, targetId: 'home' },
        { name: 'About', path: '/#about', isScroll: true, targetId: 'about' },
        { name: 'Menu', path: '/menu' },
        { name: 'Reservation', path: '/reservation' },
        { name: 'Order Online', path: '/delivery' },
        { name: 'Contact', path: '/contact', isButton: true },
    ];

    const handleNavClick = (e, link) => {
        if (link.isScroll) {
            e.preventDefault();
            if (location.pathname === '/') {
                const element = document.getElementById(link.targetId);
                if (element) {
                    const offset = 80; // Header height
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = element.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: link.targetId === 'home' ? 0 : offsetPosition,
                        behavior: 'smooth'
                    });
                }
            } else {
                window.location.href = `/${link.targetId === 'home' ? '' : '#' + link.targetId}`;
            }
            setIsMenuOpen(false);
        }
    };

    // Check if a link is active
    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
            <nav className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <SafeImage
                            src="/logo.png"
                            alt="Melissas Food Court Logo"
                            className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="hidden sm:block bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text text-xl md:text-2xl font-bold">
                            Melissa&apos;s Food Court
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => {
                            const isCurrentActive = link.isScroll && location.pathname === '/' 
                                ? activeSection === link.targetId 
                                : isActive(link.path);
                                
                            return (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={(e) => handleNavClick(e, link)}
                                    className={`text-sm font-medium transition-all duration-300 ${
                                        link.isButton 
                                            ? 'bg-[#D4AF37] hover:bg-[#E6C86E] text-black px-5 py-2 rounded-lg shadow-lg hover:scale-105 active:scale-95'
                                            : `hover:text-[#D4AF37] ${isCurrentActive ? 'text-[#D4AF37]' : 'text-gray-300'}`
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                        {/* Auth Section */}
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <Link 
                                    to="/account"
                                    className="flex items-center gap-3 p-1 pr-4 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-[#D4AF37]/30 hover:border-[#D4AF37] group"
                                >
                                    <img 
                                        src={(() => {
                                            const pic = user?.user?.profile_image;
                                            if (!pic) return AccountAvatar;
                                            if (pic.startsWith('http') || pic.startsWith('/assets')) return pic;
                                            return `${config.API_BASE_URL}${pic}`;
                                        })()}
                                        alt="Profile" 
                                        className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]"
                                        onError={(e) => { e.target.onerror = null; e.target.src = AccountAvatar; }}
                                    />
                                    <div className="hidden lg:block text-left">
                                        <p className="text-[10px] text-gray-400 leading-none">Account</p>
                                        <p className="text-sm font-bold text-white leading-tight group-hover:text-[#D4AF37] transition-colors">{user?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'User'}</p>
                                    </div>
                                </Link>
                            </div>
                        ) : (
                            <Link
                                to="/auth"
                                className="ml-4 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#E6C86E] hover:to-[#D4AF37] text-black px-8 py-2 rounded-full font-bold text-sm transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-[#D4AF37]/20 whitespace-nowrap"
                            >
                                Login
                            </Link>
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
                            {navLinks.map((link) => {
                                const isCurrentActive = link.isScroll && location.pathname === '/' 
                                    ? activeSection === link.targetId 
                                    : isActive(link.path);

                                return (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        onClick={(e) => {
                                            handleNavClick(e, link);
                                            setIsMenuOpen(false);
                                        }}
                                        className={`text-base font-medium transition-all duration-300 hover:text-[#D4AF37] ${isCurrentActive ? 'text-[#D4AF37]' : 'text-gray-300'
                                            }`}
                                    >
                                        {link.name}
                                    </Link>
                                );
                            })}
                            {isAuthenticated && (
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="text-left text-base font-medium text-red-500 hover:text-red-400 transition-colors flex items-center gap-2"
                                >
                                    <span>Logout</span>
                                    <span>🚪</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}

export default Header;
