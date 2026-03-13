import { useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import SafeImage from '../components/SafeImage';

/**
 * Contact Page - Location, contact form, and maps
 */
function Contact() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    return (
        <div className="min-h-screen px-4 py-16">
            <div className="container mx-auto">
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text mb-6">
                        Get In Touch
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        We'd love to hear from you. Visit us, call us, or send a message.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 animate-slide-up">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <GlassCard className="p-8 border-[#D4AF37]/20">
                            <h2 className="text-2xl font-bold text-white mb-8">Contact Information</h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-2xl">📍</div>
                                    <div>
                                        <h3 className="font-bold text-white">Location</h3>
                                        <p className="text-gray-400">123 Heritage Lane, Colombo 07, Sri Lanka</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-2xl">📞</div>
                                    <div>
                                        <h3 className="font-bold text-white">Phone</h3>
                                        <p className="text-gray-400">+94 77 123 4567</p>
                                        <p className="text-gray-400">+94 11 234 5678</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-2xl">✉️</div>
                                    <div>
                                        <h3 className="font-bold text-white">Email</h3>
                                        <p className="text-gray-400">info@melissasfoodcourt.lk</p>
                                        <p className="text-gray-400">reservations@melissasfoodcourt.lk</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-2xl">🕚</div>
                                    <div>
                                        <h3 className="font-bold text-white">Opening Hours</h3>
                                        <p className="text-gray-400">Mon - Sun: 11:00 AM - 11:00 PM</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Map Mockup */}
                        <GlassCard className="p-0 overflow-hidden h-[300px] border-[#D4AF37]/20 relative">
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[#D4AF37] font-bold text-xl italic p-8 text-center">
                                Google Maps Interaction Area
                            </div>
                            <SafeImage 
                                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?auto=format&fit=crop&q=80&w=800"
                                alt="Map Location" 
                                className="w-full h-full object-cover grayscale opacity-50"
                            />
                        </GlassCard>
                    </div>

                    {/* Contact Form */}
                    <GlassCard className="p-8 border-[#D4AF37]/20 h-fit">
                        <h2 className="text-2xl font-bold text-white mb-8">Send a Message</h2>
                        <form className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                                    <input type="text" className="input-glass w-full" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                                    <input type="email" className="input-glass w-full" placeholder="john@example.com" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                                <input type="text" className="input-glass w-full" placeholder="General Inquiry" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                                <textarea className="input-glass w-full h-32 resize-none" placeholder="Your message here..."></textarea>
                            </div>

                            <Button className="w-full bg-[#D4AF37] hover:bg-[#E6C86E] text-black">
                                Send Message
                            </Button>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default Contact;
