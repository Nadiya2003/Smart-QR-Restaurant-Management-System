import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PortalSelection() {
    const navigate = useNavigate();
    const [hoveredPortal, setHoveredPortal] = useState(null);

    const handleCustomerPortal = () => {
        navigate('/customer/select-steward');
    };

    const handleStaffPortal = () => {
        navigate('/staff/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.15),transparent_70%)]"></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
                {/* Logo and Title */}
                <div className="mb-16 text-center transform hover:scale-105 transition-transform duration-500">
                    <img
                        src="/logo.png"
                        alt="Smart QR Restaurant Logo"
                        className="h-40 w-auto mx-auto mb-8 drop-shadow-[0_0_30px_rgba(212,175,55,0.4)] animate-fade-in object-contain"
                    />
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white via-gold-300 to-white bg-clip-text text-transparent drop-shadow-lg tracking-tight">
                        Melissa's Food Court
                    </h1>
                    <p className="text-xl md:text-2xl text-gold-300/90 font-light tracking-wide">
                        Experience Dining Reimagined
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                    {/* Customer Portal Card */}
                    <button
                        onClick={handleCustomerPortal}
                        onMouseEnter={() => setHoveredPortal('customer')}
                        onMouseLeave={() => setHoveredPortal(null)}
                        className="group relative h-[400px] w-full perspective-1000"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br from-gold-500/20 to-transparent rounded-3xl blur-xl transition-opacity duration-500 ${hoveredPortal === 'customer' ? 'opacity-100' : 'opacity-0'}`} />

                        <div className={`relative h-full glass-card p-10 flex flex-col items-center justify-center text-center border-2 transition-all duration-500 ${hoveredPortal === 'customer'
                            ? 'border-gold-500/50 bg-black/60 translate-y-[-10px]'
                            : 'border-white/10 bg-black/40 hover:border-gold-500/30'
                            }`}>
                            <div className={`w-28 h-28 mb-8 rounded-full flex items-center justify-center transition-all duration-500 ${hoveredPortal === 'customer'
                                ? 'bg-gold-500 text-black shadow-[0_0_30px_rgba(212,175,55,0.6)]'
                                : 'bg-white/5 text-gold-500 border border-gold-500/20'
                                }`}>
                                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>

                            <h2 className="text-4xl font-bold mb-4 text-white group-hover:text-gold-400 transition-colors">
                                Customer
                            </h2>
                            <p className="text-gray-300 text-lg mb-8 leading-relaxed max-w-sm">
                                Browse our exquisite menu, place orders, and manage reservations
                            </p>

                            <div className={`flex items-center gap-3 text-gold-400 font-medium tracking-wide uppercase text-sm transition-all duration-300 ${hoveredPortal === 'customer' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                <span>Enter Portal</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                    </button>

                    {/* Staff Portal Card */}
                    <button
                        onClick={handleStaffPortal}
                        onMouseEnter={() => setHoveredPortal('staff')}
                        onMouseLeave={() => setHoveredPortal(null)}
                        className="group relative h-[400px] w-full perspective-1000"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br from-gold-500/20 to-transparent rounded-3xl blur-xl transition-opacity duration-500 ${hoveredPortal === 'staff' ? 'opacity-100' : 'opacity-0'}`} />

                        <div className={`relative h-full glass-card p-10 flex flex-col items-center justify-center text-center border-2 transition-all duration-500 ${hoveredPortal === 'staff'
                            ? 'border-gold-500/50 bg-black/60 translate-y-[-10px]'
                            : 'border-white/10 bg-black/40 hover:border-gold-500/30'
                            }`}>
                            <div className={`w-28 h-28 mb-8 rounded-full flex items-center justify-center transition-all duration-500 ${hoveredPortal === 'staff'
                                ? 'bg-gold-500 text-black shadow-[0_0_30px_rgba(212,175,55,0.6)]'
                                : 'bg-white/5 text-gold-500 border border-gold-500/20'
                                }`}>
                                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>

                            <h2 className="text-4xl font-bold mb-4 text-white group-hover:text-gold-400 transition-colors">
                                Staff Portal
                            </h2>
                            <p className="text-gray-300 text-lg mb-8 leading-relaxed max-w-sm">
                                Authorized personnel access for management and operations
                            </p>

                            <div className={`flex items-center gap-3 text-gold-400 font-medium tracking-wide uppercase text-sm transition-all duration-300 ${hoveredPortal === 'staff' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                <span>Access Dashboard</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="mt-20 text-center">
                    <p className="text-gray-500 text-sm tracking-wider">
                        © 2026 Melissa's Food Court. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
