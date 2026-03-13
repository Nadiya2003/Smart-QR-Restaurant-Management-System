import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';

/**
 * AIChat Page - Restaurant Assistant Agent
 * Features:
 * - Smart response logic for common restaurant questions
 * - Quick action buttons for common queries
 * - Elegant chat UI with auto-scroll
 */
function AIChat() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: 'Hello! I am your Melissas Food Court assistant. How can I help you today? 🤖\nI can answer questions about reservations, our menu, opening hours, delivery, and more!',
        },
    ]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getAIResponse = (input) => {
        const text = input.toLowerCase();
               // Reservations
        if (text.includes('reservation') || text.includes('reserve') || text.includes('book a table') || text.includes('booking')) {
            return "You can book a table through our Reservations page or call us at +94 77 123 4567. We recommend booking 24h in advance for weekdays and 3-5 days for weekends! 📅";
        }
        
        // Menu & Diet
        if (text.includes('menu') || text.includes('food') || text.includes('eat') || text.includes('dish')) {
            return "Our fusion menu includes Sri Lankan favorites (like Chicken Kottu) and Italian classics (like Seafood Fettuccine). We also have plenty of Vegetarian, Vegan, and Gluten-Free options! 🍝🍛";
        }
        if (text.includes('veg') || text.includes('vegan') || text.includes('gluten')) {
            return "Yes! We offer a variety of vegetarian and vegan Sri Lankan curries. Our Italian section also has gluten-free pasta options. Just let our staff know! 🌱";
        }

        // Opening Hours
        if (text.includes('hour') || text.includes('open') || text.includes('time') || text.includes('close')) {
            return "We are open every single day from 11:00 AM to 11:00 PM. We hope to see you soon! 🕚";
        }

        // Delivery & Takeaway
        if (text.includes('delivery') || text.includes('order online') || text.includes('takeaway') || text.includes('pickup')) {
            return "We deliver within 10km (Colombo 1-15, Dehiwala, Rajagiriya). Delivery usually takes 30-45 mins. You can order directly on our 'Order Online' page! 🚚";
        }

        // Location & Parking
        if (text.includes('location') || text.includes('where') || text.includes('address') || text.includes('find')) {
            return "Find us at 123 Heritage Lane, Colombo 07. We have a dedicated parking area with free valet service during peak hours! 📍🚗";
        }

        // Payments
        if (text.includes('pay') || text.includes('payment') || text.includes('cash') || text.includes('card')) {
            return "We accept Cash, all major Credit/Debit cards (Visa, MasterCard, Amex), and secure online payments via PayHere. 💳";
        }

        // Atmosphere / Family
        if (text.includes('family') || text.includes('kid') || text.includes('child')) {
            return "We are very family-friendly! We have high chairs and a special kids' menu to keep the little ones happy. 👨‍👩‍👧‍👦";
        }
        if (text.includes('outdoor') || text.includes('garden') || text.includes('terrace')) {
            return "Yes, we have a beautiful garden terrace for outdoor dining. It's a customer favorite during the evenings! 🌿";
        }

        // Special Offers / events
        if (text.includes('offer') || text.includes('discount') || text.includes('deal')) {
            return "Get 10% OFF your first online order! Also, don't miss our Happy Hour every Friday from 5 PM to 7 PM. 🥂";
        }
        if (text.includes('event') || text.includes('party') || text.includes('celebrate')) {
            return "From birthdays to corporate parties, we host them all! Contact us via the 'Contact' page for event packages and catering options. 🎉";
        }

        // Help / FAQ
        if (text.includes('help') || text.includes('faq') || text.includes('question')) {
            return "I can answer almost anything about Melissas Food Court. Ask about: menu, reservations, delivery, hours, parking, or payments!";
        }

        return "Good question! For very specific inquiries, check our FAQ page or give us a call at +94 77 123 4567. Our team is always happy to help! 📞";
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: inputText };
        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse = getAIResponse(userMsg.text);
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: aiResponse,
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1000);
    };

    const handleQuickQuestion = (question) => {
        setInputText(question);
        // We set a brief timeout to allow the state to update before sending
        setTimeout(() => {
            const userMsg = { id: Date.now(), sender: 'user', text: question };
            setMessages((prev) => [...prev, userMsg]);
            setInputText('');
            setIsTyping(true);

            setTimeout(() => {
                const aiResponse = getAIResponse(question);
                const aiMsg = {
                    id: Date.now() + 1,
                    sender: 'ai',
                    text: aiResponse,
                };
                setMessages((prev) => [...prev, aiMsg]);
                setIsTyping(false);
            }, 800);
        }, 0);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-8 flex flex-col items-center">
            <div className="container mx-auto max-w-4xl flex-1 flex flex-col w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Restaurant Assistant</h1>
                    <p className="text-gray-400">Ask us anything about Melissas Food Court</p>
                </div>

                <GlassCard className="flex-1 flex flex-col h-[550px] md:h-[650px] mb-4 overflow-hidden border-[#D4AF37]/20 relative">
                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-black/20">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            >
                                <div
                                    className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm md:text-base whitespace-pre-line ${
                                        msg.sender === 'user'
                                            ? 'bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-black font-medium rounded-tr-none shadow-lg'
                                            : 'bg-white/10 text-white font-light rounded-tl-none border border-white/5 backdrop-blur-md'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-white/5 text-gray-400 px-5 py-3 rounded-2xl rounded-tl-none border border-white/5">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions */}
                    <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-t border-white/5">
                        <button
                            onClick={() => handleQuickQuestion('What are your opening hours?')}
                            className="btn-quick"
                        >
                            🕒 Hours
                        </button>
                        <button
                            onClick={() => handleQuickQuestion('How do I book a table?')}
                            className="btn-quick"
                        >
                            📅 Reservations
                        </button>
                        <button
                            onClick={() => handleQuickQuestion('Do you offer delivery?')}
                            className="btn-quick"
                        >
                            🚚 Delivery
                        </button>
                        <button
                            onClick={() => handleQuickQuestion('Where are you located?')}
                            className="btn-quick"
                        >
                            📍 Location
                        </button>
                        <button
                            onClick={() => handleQuickQuestion('What is on the menu?')}
                            className="btn-quick"
                        >
                            🍕 Menu
                        </button>
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 md:p-6 bg-black/30 border-t border-[#D4AF37]/20 flex gap-3">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a question..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isTyping}
                            className="bg-[#D4AF37] hover:bg-[#E6C86E] disabled:bg-gray-700 disabled:opacity-50 text-black w-14 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#D4AF37]/20"
                        >
                            <svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}

export default AIChat;
