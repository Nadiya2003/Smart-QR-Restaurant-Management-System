import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

/**
 * FAQ Page - Frequently Asked Questions
 * Covers reservations, restaurant info, menu, orders, payments, events, and support.
 */
function FAQ() {
    const [openIndex, setOpenIndex] = useState(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const allQuestions = [
        { q: "What are your opening hours?", a: "We are open from 10:00 AM to 11:00 PM every day." },
        { q: "Do you offer takeaway and delivery?", a: "Yes, we provide both takeaway and delivery services through the Order Online section." },
        { q: "Can I reserve a table online?", a: "Yes, you can reserve a table through the Reservation page after logging in." },
        { q: "What payment methods do you accept?", a: "We accept online payments including credit/debit cards." },
        { q: "Do you have vegetarian options?", a: "Yes, we offer several vegetarian dishes in our menu." },
        { q: "Do I need to login to reserve?", a: "Yes, for security and tracking, you must have an account and be logged in to make a table reservation." },
        { q: "Can I reserve for large groups?", a: "Absolutely. For groups larger than 10 people, we recommend calling us at least 48 hours in advance." },
        { q: "Is there a reservation fee?", a: "No, online reservations are completely free. You only pay for the food you order at the restaurant." },
        { q: "What is your delivery radius?", a: "We deliver within a 10km radius of our restaurant, covering major parts of the city." },
        { q: "How long does delivery take?", a: "Standard delivery time is between 30 to 45 minutes, depending on traffic and order volume." }
    ];

    const displayedQuestions = showAll ? allQuestions : allQuestions.slice(0, 5);

    return (
        <div className="min-h-screen px-4 py-20 bg-[#0a0a0a]">
            <div className="container mx-auto max-w-3xl">
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text mb-6">
                        Support Center
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Everything you need to know about dining at Melissas Food Court.
                    </p>
                </div>

                <div className="space-y-4">
                    {displayedQuestions.map((faq, idx) => (
                        <GlassCard 
                            key={idx} 
                            className={`cursor-pointer transition-all duration-300 border-white/5 hover:border-[#D4AF37]/30 ${openIndex === idx ? 'ring-1 ring-[#D4AF37]/50 bg-white/5' : ''}`}
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        >
                            <div className="flex justify-between items-center px-2">
                                <h3 className={`text-lg font-bold transition-colors ${openIndex === idx ? 'text-[#D4AF37]' : 'text-white'}`}>
                                    {faq.q}
                                </h3>
                                <span className={`text-[#D4AF37] transition-transform duration-500 ${openIndex === idx ? 'rotate-180' : ''}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </div>
                            <div className={`overflow-hidden transition-all duration-500 ${openIndex === idx ? 'max-h-[500px] mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <p className="text-gray-400 leading-relaxed border-t border-white/5 pt-6 text-base px-2">
                                    {faq.a}
                                </p>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {!showAll && (
                    <div className="text-center mt-12 animate-fade-in">
                        <Button 
                            variant="outline" 
                            onClick={() => setShowAll(true)}
                            className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        >
                            Show More Questions
                        </Button>
                    </div>
                )}

                <div className="mt-20 text-center animate-fade-in bg-white/5 p-10 rounded-3xl border border-white/10">
                    <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
                    <p className="text-gray-400 mb-8">Can't find the answer you're looking for? Please chat with our friendly team.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button onClick={() => window.location.href = '/contact'} className="bg-[#D4AF37] text-black">
                            Contact Support
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/ai-chat'}>
                            Chat with AI
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FAQ;
