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
        
        if (text.includes('recommend') || text.includes('popular') || text.includes('suggest') || text.includes('best') || text.includes('special')) {
            return "Our house favorites include the Signature Spicy Chicken Kottu, Creamy Seafood Fettuccine, and our Traditional Sri Lankan Crab Curry. For light bites, our Italian Bruschetta is highly rated! 🍛🍝";
        }
        
        if (text.includes('menu') || text.includes('food') || text.includes('eat') || text.includes('dish')) {
            return "We serve a unique fusion of Sri Lankan and Italian cuisine. From authentic Rice & Curry to handmade Pizzas and Pastas. You can view the full menu on our dedicated Menu page! 🍕🍛";
        }

        if (text.includes('sri lankan') || text.includes('local')) {
            return "Our Sri Lankan menu features authentic Kottu, Lamprais, Hoppers (during dinner), and a variety of spicy curries using locally sourced spices. 🌶️🍛";
        }

        if (text.includes('italian') || text.includes('pasta') || text.includes('pizza')) {
            return "We offer authentic thin-crust Italian pizzas, creamy pastas like Carbonara and Alfredo, and classic starters like Caprese Salad. 🍕🍝";
        }

        if (text.includes('reservation') || text.includes('reserve') || text.includes('book') || text.includes('table')) {
            return "Table bookings are available online! Simply login to your account and go to the 'Reservation' section. We confirm bookings instantly! 📅";
        }
        
        if (text.includes('hour') || text.includes('open') || text.includes('time') || text.includes('close')) {
            return "We are open daily from 10:00 AM to 11:00 PM. Our kitchen usually takes the last order by 10:30 PM. 🕚";
        }

        if (text.includes('delivery') || text.includes('order') || text.includes('takeaway') || text.includes('shipping')) {
            return "We offer island-wide delivery in Colombo districts (10km radius) and local takeaway. Order directly through our 'Order Online' section and pay securely! 🚚🛍️";
        }

        if (text.includes('loyalty') || text.includes('point') || text.includes('reward') || text.includes('member')) {
            return "Members earn 1 loyalty point for every Rs. 100 spent! You can check your current points in your profile dropdown. Points can be used for future discounts! ✨💰";
        }

        if (text.includes('human') || text.includes('call') || text.includes('contact') || text.includes('support') || text.includes('phone')) {
            return "You can reach our team directly at +94 77 123 4567 or email us at nadeesha0532@gmail.com. We're happy to help! 📞✉️";
        }

        if (text.includes('where') || text.includes('location') || text.includes('address') || text.includes('map')) {
            return "We are located at 123 Heritage Lane, Colombo 07. Valet parking is available for all our dining guests! 📍🚗";
        }

        return "I can help you with menu details, reservations, delivery info, and loyalty rewards! Could you please rephrase your question? 🤖";
    };

    const processMessage = (text) => {
        const userMsg = { id: Date.now(), sender: 'user', text };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
            const aiResponse = getAIResponse(text);
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: aiResponse,
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        }, 800);
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        const text = inputText.trim();
        if (!text || isTyping) return;

        setInputText('');
        processMessage(text);
    };

    const handleQuickQuestion = (question) => {
        if (isTyping) return;
        processMessage(question);
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
