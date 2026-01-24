import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import Carousel from '../components/Carousel';

/**
 * Home Page - Landing page with hero section, CTAs, carousel, and features
 * Updated with GOLD theme (#D4AF37)
 */
function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-16 md:py-24">
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text">
                            Melissas Food Court
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
                    <Button onClick={() => navigate('/menu')} variant="outline" size="lg">
                        🛍️ Order Takeaway
                    </Button>
                    <Button onClick={() => navigate('/delivery')} variant="outline" size="lg">
                        🚚 Order Delivery
                    </Button>
                </div>

                {/* Photo Carousel */}
                <div className="mb-16 animate-fade-in">
                    <Carousel />
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
            <section className="container mx-auto px-4 py-16 border-t border-white/10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Welcome to Melissas Food Court
                    </h2>
                    <p className="text-gray-300 text-lg leading-relaxed mb-4">
                        Since our opening, we&apos;ve been committed to bringing you the finest culinary experiences.
                        Our chefs blend traditional Sri Lankan cooking techniques with Italian culinary artistry
                        to create dishes that celebrate both cultures.
                    </p>
                    <p className="text-gray-400 leading-relaxed">
                        Whether you&apos;re craving spicy Chicken Kottu or creamy Chicken Alfredo Pasta,
                        our menu offers something special for every palate. Dine with us and discover
                        why we&apos;re Sri Lanka&apos;s premier destination for fusion cuisine.
                    </p>
                </div>
            </section>
        </div>
    );
}

export default Home;
