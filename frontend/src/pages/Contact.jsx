import { useState, useEffect } from 'react';
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

    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        try {
            const res = await fetch(`${config.API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', text: data.message });
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                setStatus({ type: 'error', text: data.message });
            }
        } catch (err) {
            setStatus({ type: 'error', text: 'Connection failed. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

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
                                <div className="flex items-start gap-4 group/item cursor-default">
                                    <div className="w-16 h-12 bg-[#D4AF37]/5 rounded-sm flex flex-col items-center justify-center text-[10px] font-bold text-[#D4AF37] tracking-widest border border-[#D4AF37]/20 group-hover/item:bg-[#D4AF37] group-hover/item:text-black transition-all duration-500">LOC</div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1 group-hover/item:text-[#D4AF37] transition-colors">Our Location</h3>
                                        <p className="text-gray-400 text-sm">No 151, Kandy Road, Yakkala, Gampaha</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group/item cursor-default">
                                    <div className="w-16 h-12 bg-[#D4AF37]/5 rounded-sm flex flex-col items-center justify-center text-[10px] font-bold text-[#D4AF37] tracking-widest border border-[#D4AF37]/20 group-hover/item:bg-[#D4AF37] group-hover/item:text-black transition-all duration-500">TEL</div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1 group-hover/item:text-[#D4AF37] transition-colors">Direct Line</h3>
                                        <p className="text-gray-400 text-sm">+94 70 426 0260</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group/item cursor-default">
                                    <div className="w-16 h-12 bg-[#D4AF37]/5 rounded-sm flex flex-col items-center justify-center text-[10px] font-bold text-[#D4AF37] tracking-widest border border-[#D4AF37]/20 group-hover/item:bg-[#D4AF37] group-hover/item:text-black transition-all duration-500">MSG</div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1 group-hover/item:text-[#D4AF37] transition-colors">Official Email</h3>
                                        <p className="text-gray-400 text-sm">info@melissasfoodcourt.com</p>
                                        <p className="text-gray-400 text-sm opacity-50">reservations@melissasfoodcourt.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 group/item cursor-default">
                                    <div className="w-16 h-12 bg-[#D4AF37]/5 rounded-sm flex flex-col items-center justify-center text-[10px] font-bold text-[#D4AF37] tracking-widest border border-[#D4AF37]/20 group-hover/item:bg-[#D4AF37] group-hover/item:text-black transition-all duration-500">HRS</div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1 group-hover/item:text-[#D4AF37] transition-colors">Service Hours</h3>
                                        <p className="text-gray-400 text-sm">Mon - Sun: 11:00 AM - 11:00 PM</p>
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
                        {status && (
                            <div className={`mb-6 p-4 rounded-xl border ${status.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                                {status.text}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="input-glass w-full"
                                        placeholder="Sunimal Perera"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="input-glass w-full"
                                        placeholder="sunimal@gmail.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                                <input
                                    type="text"
                                    className="input-glass w-full"
                                    placeholder="General Inquiry"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                                <textarea
                                    required
                                    className="input-glass w-full h-32 resize-none"
                                    placeholder="Your message here..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                ></textarea>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#D4AF37] hover:bg-[#E6C86E] text-black"
                            >
                                {loading ? 'Sending...' : 'Send Message'}
                            </Button>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default Contact;
