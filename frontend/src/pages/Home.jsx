import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import Carousel from '../components/Carousel';
import SafeImage from '../components/SafeImage';
import { useAuth } from '../context/AuthContext';

/**
 * Home Page - Landing page with hero section, CTAs, carousel, and features
 * Updated with GOLD theme (#D4AF37)
 */
function Home() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const navigate = useNavigate();
    const location = useLocation();
    const { setOrderType } = useCart();
    const { isAuthenticated } = useAuth();
    const [faqOpen, setFaqOpen] = useState(null);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    const offset = 80; // Header offset
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = element.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;
                    window.scrollTo({
                        top: id === 'home' ? 0 : offsetPosition,
                        behavior: 'smooth'
                    });
                }, 100);
            }
        }
    }, [location]);

    const homeFAQ = [
        { q: "What are your opening hours?", a: "We are open from 10:00 AM to 11:00 PM every day." },
        { q: "Do you offer takeaway and delivery?", a: "Yes, we provide both takeaway and delivery services through the Order Online section." },
        { q: "Can I reserve a table online?", a: "Yes, you can reserve a table through the Reservation page after logging in." },
        { q: "What payment methods do you accept?", a: "We accept online payments including credit/debit cards." },
        { q: "Do you have vegetarian options?", a: "Yes, we offer several vegetarian dishes in our menu." }
    ];

    const carouselImages = [
        { url: "/images/1.jpg", alt: "Luxury Interior" },
        { url: "/images/2.jpg", alt: "Signature Sri Lankan" },
        { url: "/images/3.jpg", alt: "Seafood Classics" },
        { url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1200", alt: "Authentic Flavours" },
        { url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1200", alt: "Elegant Dining" },
    ];

    return (
        <div className="min-h-screen" id="home">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 md:py-24">
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text">
                            Melissa&apos;s Food Court
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-4">
                        Where Sri Lankan Heritage Meets Italian Elegance
                    </p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Experience the perfect fusion of authentic Sri Lankan spices and classic Italian flavors
                        in a luxurious dining atmosphere
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-16 animate-slide-up">
                    <Button onClick={() => navigate('/reservation')} size="lg">
                        📅 Book a Table
                    </Button>
                    <Button 
                        onClick={() => {
                            if (!isAuthenticated) {
                                localStorage.setItem('postLoginTarget', '/delivery');
                                localStorage.setItem('intendedOrderType', 'takeaway');
                                navigate('/auth');
                                return;
                            }
                            setOrderType('takeaway');
                            navigate('/delivery');
                        }} 
                        variant="outline" size="lg"
                    >
                        🛍️ Order Takeaway
                    </Button>
                    <Button 
                        onClick={() => {
                            if (!isAuthenticated) {
                                localStorage.setItem('postLoginTarget', '/delivery');
                                localStorage.setItem('intendedOrderType', 'delivery');
                                navigate('/auth');
                                return;
                            }
                            setOrderType('delivery');
                            navigate('/delivery');
                        }} 
                        variant="outline" size="lg"
                    >
                        🚚 Order Delivery
                    </Button>
                    <Button 
                        onClick={() => {
                            const element = document.getElementById('ai-assistant');
                            if (element) {
                                const offset = 80;
                                const bodyRect = document.body.getBoundingClientRect().top;
                                const elementRect = element.getBoundingClientRect().top;
                                const elementPosition = elementRect - bodyRect;
                                const offsetPosition = elementPosition - offset;
                                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                            }
                        }} 
                        variant="outline" size="lg"
                    >
                        🤖 AI Assistant
                    </Button>
                </div>

                {/* Photo Carousel */}
                <div className="mb-16 animate-fade-in">
                    <Carousel images={carouselImages} />
                </div>

                {/* Feature Cards */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                    <GlassCard className="text-center hover:scale-105 transition-transform duration-300">
                        <div className="text-5xl mb-4">🍛</div>
                        <h3 className="text-xl font-bold text-white mb-3">
                            Authentic Sri Lankan & Italian Flavours
                        </h3>
                        <p className="text-gray-400">
                            Savor traditional Sri Lankan cuisine alongside timeless Italian classics,
                            all crafted with premium ingredients and authentic recipes
                        </p>
                    </GlassCard>

                    <GlassCard className="text-center hover:scale-105 transition-transform duration-300">
                        <div className="text-5xl mb-4">✨</div>
                        <h3 className="text-xl font-bold text-white mb-3">
                            Premium Dining Experience
                        </h3>
                        <p className="text-gray-400">
                            Indulge in a sophisticated atmosphere designed for unforgettable moments,
                            perfect for both intimate dinners and grand celebrations
                        </p>
                    </GlassCard>

                    <GlassCard className="text-center hover:scale-105 transition-transform duration-300">
                        <div className="text-5xl mb-4">⚡</div>
                        <h3 className="text-xl font-bold text-white mb-3">
                            Fast & Friendly Service
                        </h3>
                        <p className="text-gray-400">
                            Our dedicated team ensures prompt service with a smile,
                            making every visit seamless from reservation to dessert
                        </p>
                    </GlassCard>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="container mx-auto px-4 py-20 border-t border-white/5">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-transparent bg-clip-text mb-4">
                            About Melissa&apos;s Food Court
                        </h2>
                        <div className="w-24 h-1 bg-[#D4AF37] mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <p className="text-gray-300 text-lg leading-relaxed">
                                Since our opening, we&apos;ve been committed to bringing you the finest culinary experiences.
                                Our chefs blend traditional Sri Lankan cooking techniques with Italian culinary artistry
                                to create dishes that celebrate both cultures.
                            </p>
                            <p className="text-gray-400 leading-relaxed">
                                Whether you&apos;re craving spicy Chicken Kottu or creamy Chicken Alfredo Pasta,
                                our menu offers something special for every palate. Dine with us and discover
                                why we&apos;re Sri Lanka&apos;s premier destination for fusion cuisine.
                            </p>
                            <Button onClick={() => navigate('/about')} variant="outline">Learn More Our Story</Button>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-white/10 group">
                            <SafeImage
                                src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=1200"
                                alt="Restaurant Interior"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Gallery Preview Section */}
            <section id="gallery" className="container mx-auto px-4 py-20 border-t border-white/5">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Captured Moments</h2>
                    <p className="text-gray-400">A glimpse into our luxurious dining atmosphere</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
                        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
                        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800",
                        "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800"
                    ].map((url, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden shadow-xl border border-white/5 hover:border-[#D4AF37]/50 transition-all group">
                            <SafeImage src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    ))}
                </div>
                
                <div className="text-center mt-12">
                    <Button onClick={() => navigate('/gallery')} variant="outline">View Full Gallery</Button>
                </div>
            </section>


            {/* AI Assistant Landing Section */}
            <section id="ai-assistant" className="py-20 border-t border-white/5">
                <div className="container mx-auto px-4">
                    <GlassCard className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 p-8 md:p-16 border-[#D4AF37]/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="flex-1 space-y-6 z-10 text-center md:text-left">
                            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                                Meet Your <span className="text-[#D4AF37]">Smart Assistant</span>
                            </h2>
                            <p className="text-gray-400 text-lg">
                                Have questions about our dishes, opening times, or need help with a booking?
                                Our AI-powered assistant is here 24/7 to help you with everything you need.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                <Button onClick={() => navigate('/ai-chat')} size="lg">
                                    💬 Open Assistant
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 w-full max-w-sm z-10">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                                <SafeImage
                                    src="https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?auto=format&fit=crop&q=80&w=1200"
                                    alt="AI Assistant Placeholder"
                                    className="rounded-2xl border border-white/10 shadow-2xl relative z-10 grayscale group-hover:grayscale-0 transition-all duration-500"
                                />
                                <div className="absolute -bottom-6 -right-6 bg-[#D4AF37] text-black font-bold p-4 rounded-xl shadow-xl animate-bounce z-20 hidden md:block">
                                    "I can help you today! 🤖"
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section id="faq" className="container mx-auto px-4 py-20 border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Common Questions</h2>
                        <p className="text-gray-400">Everything you need to know about dining with us</p>
                    </div>

                    <div className="space-y-4">
                        {homeFAQ.map((item, idx) => (
                            <GlassCard
                                key={idx}
                                className={`cursor-pointer transition-all duration-300 border-white/5 hover:border-[#D4AF37]/30 ${faqOpen === idx ? 'ring-1 ring-[#D4AF37]/50' : ''}`}
                                onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className={`text-lg font-bold transition-colors ${faqOpen === idx ? 'text-[#D4AF37]' : 'text-white'}`}>
                                        {item.q}
                                    </h3>
                                    <span className={`text-[#D4AF37] transition-transform duration-300 ${faqOpen === idx ? 'rotate-180' : ''}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </span>
                                </div>
                                <div className={`overflow-hidden transition-all duration-500 ${faqOpen === idx ? 'max-h-[500px] mt-4' : 'max-h-0'}`}>
                                    <p className="text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                                        {item.a}
                                    </p>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Button onClick={() => navigate('/faq')} variant="outline">View All FAQs</Button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;
