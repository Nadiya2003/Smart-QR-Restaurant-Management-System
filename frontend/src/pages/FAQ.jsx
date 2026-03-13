import GlassCard from '../components/GlassCard';

/**
 * FAQ Page - Frequently Asked Questions
 * Covers reservations, restaurant info, menu, orders, payments, events, and support.
 */
function FAQ() {
    const faqData = [
        {
            category: "Reservation Questions",
            questions: [
                { q: "Do I need to make a reservation?", a: "While we welcome walk-ins, we highly recommend making a reservation, especially during weekends and holidays, to ensure you have a table waiting for you." },
                { q: "How can I reserve a table?", a: "You can reserve a table through our website's 'Reservations' page, or by calling us directly at +94 77 123 4567." },
                { q: "Can I book a table online?", a: "Yes! Our online reservation system is available 24/7. Simply go to the 'Reservations' page and fill out the form." },
                { q: "Can I reserve a table for a large group?", a: "Absolutely. For groups larger than 10 people, we recommend calling us at least 48 hours in advance so we can arrange the best seating for your party." },
                { q: "How far in advance should I book?", a: "We recommend booking at least 24 hours in advance for weekdays and 3-5 days in advance for weekends or special occasions." }
            ]
        },
        {
            category: "Restaurant Info",
            questions: [
                { q: "What are your opening hours?", a: "We are open daily from 11:00 AM to 11:00 PM." },
                { q: "Where is the restaurant located?", a: "We are located at 123 Heritage Lane, Colombo 07, Sri Lanka." },
                { q: "Do you have parking facilities?", a: "Yes, we have a dedicated parking area for our customers with valet service available during peak hours." },
                { q: "Is the restaurant family friendly?", a: "Yes, Melissas Food Court is a family-friendly establishment. We have high chairs and a special kids' menu available." },
                { q: "Do you have outdoor seating?", a: "Yes, we have a beautiful garden terrace for those who prefer outdoor dining." }
            ]
        },
        {
            category: "Menu Questions",
            questions: [
                { q: "Can I see the menu?", a: "Our full menu is available on the 'Menu' page of this website. We offer a fusion of Sri Lankan and Italian cuisine." },
                { q: "Do you offer vegetarian options?", a: "Yes, we have a wide variety of vegetarian Sri Lankan curries and Italian pasta dishes." },
                { q: "Do you offer vegan meals?", a: "Many of our Sri Lankan vegetable curries are naturally vegan. Please inform your server of your preferences." },
                { q: "Do you have gluten-free dishes?", a: "Yes, we offer gluten-free pasta and many of our rice-based Sri Lankan dishes are gluten-free." },
                { q: "What are your most popular dishes?", a: "Our signature Chicken Kottu and Seafood Fettuccine are customer favorites!" }
            ]
        },
        {
            category: "Orders & Delivery",
            questions: [
                { q: "Do you offer food delivery?", a: "Yes, we offer delivery within a 10km radius of our restaurant." },
                { q: "What areas do you deliver to?", a: "We deliver to Colombo 1-15, Dehiwala, and Rajagiriya." },
                { q: "What is the delivery time?", a: "Usually between 30 to 45 minutes depending on your location and traffic." },
                { q: "How can I place an online order?", a: "Go to our 'Order Online' page, select your items, and proceed to checkout." },
                { q: "Can I track my order?", a: "Yes, once your order is placed, you can track its status in the 'Account' section." }
            ]
        },
        {
            category: "Payments",
            questions: [
                { q: "What payment methods do you accept?", a: "We accept Cash, Credit/Debit cards (Visa, MasterCard, Amex), and online payments via PayHere." },
                { q: "Can I pay online?", a: "Yes, you can pay securely online when placing your order through our website." },
                { q: "Do you accept credit cards?", a: "Yes, all major credit cards are accepted both in-restaurant and for delivery." }
            ]
        }
    ];

    return (
        <div className="min-h-screen px-4 py-16">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E6C86E] to-[#D4AF37] text-transparent bg-clip-text mb-6">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Everything you need to know about dining at Melissas Food Court.
                    </p>
                </div>

                <div className="space-y-12">
                    {faqData.map((section, idx) => (
                        <div key={idx} className="animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                            <h2 className="text-2xl font-bold text-[#D4AF37] mb-6 border-l-4 border-[#D4AF37] pl-4">
                                {section.category}
                            </h2>
                            <div className="grid gap-4">
                                {section.questions.map((faq, fidx) => (
                                    <GlassCard key={fidx} className="hover:border-[#D4AF37]/50 transition-colors">
                                        <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
                                        <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-20 text-center animate-fade-in">
                    <p className="text-gray-400 mb-6">Still have questions?</p>
                    <a 
                        href="/contact" 
                        className="inline-block bg-[#D4AF37] hover:bg-[#E6C86E] text-black font-bold py-3 px-8 rounded-xl transition-all hover:scale-105"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}

export default FAQ;
