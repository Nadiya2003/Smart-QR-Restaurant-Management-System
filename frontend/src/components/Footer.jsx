import { Link } from 'react-router-dom';

/**
 * Footer Component - Modern, multi-column footer with gold theme
 * Features:
 * - Brand section with logo and about trace
 * - Quick navigation links
 * - Contact information
 * - Opening hours
 * - Social media links (emojis)
 */
function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#050505] border-t border-white/10 pt-16 pb-8 text-gray-400 animate-fade-in">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="flex flex-col gap-6">
                        <Link to="/" className="flex items-center gap-3 group">
                            <img
                                src="/logo.png"
                                alt="Melissas Food Court Logo"
                                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text text-xl font-bold">
                                Melissas Food Court
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-xs">
                            Experience the perfect fusion of Sri Lankan heritage and Italian elegance.
                            From spicy authentic curries to creamy classic pastas, we bring you the
                            best of both worlds.
                        </p>
                        <div className="flex gap-4 text-xl">
                            <a href="#" className="hover:text-[#D4AF37] transition-colors" title="Facebook">📘</a>
                            <a href="#" className="hover:text-[#D4AF37] transition-colors" title="Instagram">📸</a>
                            <a href="#" className="hover:text-[#D4AF37] transition-colors" title="Twitter">🐦</a>
                            <a href="#" className="hover:text-[#D4AF37] transition-colors" title="YouTube">📺</a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-lg">Quick Links</h4>
                        <ul className="flex flex-col gap-4">
                            <li><Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link></li>
                            <li><Link to="/menu" className="hover:text-[#D4AF37] transition-colors">Explorer Menu</Link></li>
                            <li><Link to="/reservation" className="hover:text-[#D4AF37] transition-colors">Book a Table</Link></li>
                            <li><Link to="/delivery" className="hover:text-[#D4AF37] transition-colors">Order Delivery</Link></li>
                            <li><Link to="/ai-chat" className="hover:text-[#D4AF37] transition-colors">AI Assistant</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-lg">Contact Us</h4>
                        <ul className="flex flex-col gap-4 text-sm">
                            <li className="flex gap-3">
                                <span>📍</span>
                                <span>123 Gourmet Lane, Colombo 07,<br />Sri Lanka</span>
                            </li>
                            <li className="flex gap-3">
                                <span>📞</span>
                                <a href="tel:+94112345678" className="hover:text-[#D4AF37] transition-colors">+94 (11) 234 5678</a>
                            </li>
                            <li className="flex gap-3">
                                <span>📧</span>
                                <a href="mailto:info@melissasfoodcourt.com" className="hover:text-[#D4AF37] transition-colors">info@melissasfoodcourt.com</a>
                            </li>
                        </ul>
                    </div>

                    {/* Opening Hours */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-lg">Opening Hours</h4>
                        <ul className="flex flex-col gap-3 text-sm">
                            <li className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span>Mon - Fri:</span>
                                <span className="text-white">10:00 AM - 10:00 PM</span>
                            </li>
                            <li className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span>Saturday:</span>
                                <span className="text-white">09:00 AM - 11:00 PM</span>
                            </li>
                            <li className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span>Sunday:</span>
                                <span className="text-white">09:00 AM - 10:00 PM</span>
                            </li>
                            <li className="mt-4 text-xs italic text-gray-500">
                                * Last orders are taken 30 minutes before closing.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                    <p>© {currentYear} Melissas Food Court. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
