import { Link } from 'react-router-dom';
import SafeImage from './SafeImage';

/**
 * Footer Component - Modern, multi-column footer with gold theme
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
                            <SafeImage
                                src="/logo.png"
                                alt="Melissas Food Court Logo"
                                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                            <span className="bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text text-xl font-bold">
                                Melissa&apos;s Food Court
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-xs">
                            Experience the perfect fusion of Sri Lankan heritage and Italian elegance.
                            From spicy authentic curries to creamy classic pastas, we bring you the
                            best of both worlds.
                        </p>
                        <div className="flex gap-8 text-[10px] tracking-[0.2em] font-bold uppercase mt-2">
                            <a href="#" className="hover:text-[#D4AF37] transition-all hover:translate-y-[-2px]" title="Facebook">FB</a>
                            <a href="#" className="hover:text-[#D4AF37] transition-all hover:translate-y-[-2px]" title="Instagram">IG</a>
                            <a href="#" className="hover:text-[#D4AF37] transition-all hover:translate-y-[-2px]" title="Twitter">TW</a>
                            <a href="#" className="hover:text-[#D4AF37] transition-all hover:translate-y-[-2px]" title="YouTube">YT</a>
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
                        <ul className="flex flex-col gap-6 text-sm">
                            <li className="flex flex-col gap-1 group/loc">
                                <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold opacity-60 group-hover/loc:opacity-100 transition-opacity">Location</span>
                                <span className="text-gray-300">No 151, Kandy Road, Yakkala, Gampaha</span>
                            </li>
                            <li className="flex flex-col gap-1 group/con">
                                <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold opacity-60 group-hover/con:opacity-100 transition-opacity">Connect</span>
                                <a href="tel:+94704260260" className="text-gray-300 hover:text-[#D4AF37] transition-colors">+94 (70) 426 0260</a>
                            </li>
                            <li className="flex flex-col gap-1 group/inq">
                                <span className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold opacity-60 group-hover/inq:opacity-100 transition-opacity">Inquiries</span>
                                <a href="mailto:info@melissasfoodcourt.com" className="text-gray-300 hover:text-[#D4AF37] transition-colors">info@melissasfoodcourt.com</a>
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
                    <p>© {currentYear} Melissa&apos;s Food Court. All rights reserved.</p>
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
