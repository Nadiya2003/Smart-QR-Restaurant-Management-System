import GlassCard from '../components/GlassCard';
import { useEffect } from 'react';
import SafeImage from '../components/SafeImage';

/**
 * About Page - Story and mission
 */
function About() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <SafeImage 
                        src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200" 
                        alt="Restaurant Background" 
                        className="w-full h-full object-cover blur-sm brightness-50"
                    />
                </div>
                <div className="relative z-10 text-center px-4 animate-fade-in">
                    <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text mb-6">
                        Our Story
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
                        Blending Sri Lankan heritage with Italian elegance since 1995.
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-4 py-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
                    <div className="animate-slide-up">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 border-l-4 border-[#D4AF37] pl-6">
                            Where It All Began
                        </h2>
                        <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                            <p>
                                Melissas Food Court started as a small family kitchen in the heart of Colombo. 
                                Our founder, Melissa, had a vision to create a unique dining space where the 
                                vibrant, spicy flavors of her Sri Lankan roots could dance with the sophisticated, 
                                comforting dishes of the Italian countryside.
                            </p>
                            <p>
                                Over the decades, we have evolved into a premier culinary destination, 
                                known for our commitment to authentic ingredients, innovative fusion techniques, 
                                and unparalleled hospitality.
                            </p>
                        </div>
                    </div>
                    <div className="relative animate-fade-in">
                        <div className="absolute inset-0 bg-[#D4AF37]/20 blur-3xl rounded-full -z-10"></div>
                        <SafeImage 
                            src="https://images.unsplash.com/photo-1577214286171-e716613693f9?auto=format&fit=crop&q=80&w=1200" 
                            alt="Our Founder" 
                            className="rounded-3xl shadow-2xl border border-white/10"
                        />
                    </div>
                </div>

                {/* Values Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    <GlassCard className="p-8 text-center hover:bg-[#D4AF37]/5 transition-colors">
                        <div className="text-5xl mb-6">🌱</div>
                        <h3 className="text-xl font-bold text-[#D4AF37] mb-4">Quality Ingredients</h3>
                        <p className="text-gray-400">
                            We source only the freshest organic produce and premium imported Italian staples.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-8 text-center hover:bg-[#D4AF37]/5 transition-colors">
                        <div className="text-5xl mb-6">👨‍🍳</div>
                        <h3 className="text-xl font-bold text-[#D4AF37] mb-4">Culinary Artistry</h3>
                        <p className="text-gray-400">
                            Our chefs are masters of their craft, blending traditions to create modern masterpieces.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-8 text-center hover:bg-[#D4AF37]/5 transition-colors">
                        <div className="text-5xl mb-6">❤️</div>
                        <h3 className="text-xl font-bold text-[#D4AF37] mb-4">Pure Hospitality</h3>
                        <p className="text-gray-400">
                            At Melissas, every guest is treated like family. We pride ourselves on personalized service.
                        </p>
                    </GlassCard>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-white/5 py-20 border-y border-white/5">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-[#D4AF37] mb-2">25+</div>
                            <div className="text-gray-500 uppercase tracking-widest text-sm">Years Experience</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-[#D4AF37] mb-2">15k+</div>
                            <div className="text-gray-500 uppercase tracking-widest text-sm">Happy Guests</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-[#D4AF37] mb-2">50+</div>
                            <div className="text-gray-500 uppercase tracking-widest text-sm">Signature Dishes</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-[#D4AF37] mb-2">12</div>
                            <div className="text-gray-500 uppercase tracking-widest text-sm">Top Awards</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default About;
