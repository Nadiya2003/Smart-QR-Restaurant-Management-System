import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import config from '../config';

/**
 * AIChat Page - Context-Aware Smart Restaurant Assistant
 * Features:
 * - Natural Language Understanding (NLU) & Intent Classification
 * - Real-time Database Connectivity
 * - Context Memory
 * - Dynamic Action Suggestions
 */
function AIChat() {
    const [messages, setMessages] = useState([
        {
            id: 'msg-init',
            sender: 'ai',
            text: "Hello! I am your Smart Restaurant Assistant. 👋\nI can check live table availability, track your orders, and recommend today's specials. How can I help you today?",
        },
    ]);

    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const isUserScrolling = useRef(false);

    // AI Context Memory
    const chatContext = useRef({
        lastIntent: null,
        activeOrder: null,
        selectedTable: null
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

        isUserScrolling.current = !isNearBottom;
        setShowScrollButton(!isNearBottom);
    };

    const scrollToBottom = (behavior = "auto", force = false) => {
        if (!chatContainerRef.current) return;

        if (force || !isUserScrolling.current) {
            requestAnimationFrame(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTo({
                        top: chatContainerRef.current.scrollHeight,
                        behavior
                    });
                }
            });
            setShowScrollButton(false);
            if (force) {
                isUserScrolling.current = false;
            }
        }
    };

    useEffect(() => {
        scrollToBottom("smooth", false);
    }, [messages, isTyping]);

    const fetchDataAPI = async (endpoint) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}${endpoint}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error('AI Fetch Error:', err);
            return null;
        }
    };

    const getAIResponse = async (input) => {
        const text = input.toLowerCase();

        // 1. Natural Language Understanding & Intent Keywords
        const intents = {
            order_status: ['where', 'status', 'track', 'my order', 'ready', 'preparing', 'delay', 'progress', 'when'],
            order: ['order', 'food', 'menu', 'dish', 'buy', 'cart', 'place order', 'reorder', 'cancel order', 'purchase', 'eat'],
            table: ['table', 'reserve', 'booking', 'seat', 'available', 'free table', 'reservation', 'capacity', 'free', 'empty', 'full'],
            quality: ['good', 'fresh', 'tasty', 'today special', 'popular', 'recommend', 'best food', 'best', 'special', 'quality', 'today', 'now', 'live'],
            kitchen: ['prepare', 'cooking', 'chef', 'kitchen', 'time', 'duration', 'wait'],
            billing: ['bill', 'pay', 'payment', 'total', 'receipt'],
            service: ['steward', 'help', 'service', 'call waiter', 'waiter'],
            help: ['help', 'how', 'what', 'info', 'guide', 'open', 'close', 'offer', 'discount']
        };

        // 2. Classify Intent
        let detectedIntent = null;
        for (const [intentType, keywords] of Object.entries(intents)) {
            if (keywords.some(kw => text.includes(kw))) {
                detectedIntent = intentType;
                break;
            }
        }

        // 3. Apply Context Memory Fallback
        if (!detectedIntent && (text.includes('it') || text.includes('that') || text.includes('this') || text.includes('cancel'))) {
            detectedIntent = chatContext.current.lastIntent;
        }

        chatContext.current.lastIntent = detectedIntent;

        // 4. Dynamic Responses using Live APIs
        switch (detectedIntent) {
            case 'quality':
            case 'kitchen':
                const menuData = await fetchDataAPI('/api/menu');
                if (menuData && menuData.length > 0) {
                    return "Yes, food quality is excellent today! 👍 The kitchen is running smoothly with fresh ingredients. I recommend trying out our specials. Would you like to see the menu?";
                }
                return "Our food is prepared fresh daily. Our Kitchen is running on schedule without major delays! 👨‍🍳💯";

            case 'table':
                const today = new Date();
                const dDate = today.toISOString().split('T')[0];
                const dTime = today.toTimeString().split(' ')[0].substring(0, 5); // HH:MM Output

                const tablesRes = await fetchDataAPI(`/api/reservations/availability?date=${dDate}&time=${dTime}`);
                if (tablesRes && tablesRes.tables) {
                    const availableCount = tablesRes.tables.filter(t => t.current_status === 'available').length;
                    if (availableCount > 0) {
                        return `Yes, we have ${availableCount} tables available right now. Let me know if you would like me to reserve one! 🪑`;
                    }
                    return "Our tables are currently occupied or reserved, but one might clear up soon! Check the Reservation page for live tracking. ⏳";
                }
                return "Let me check that for you... Ah, I couldn't connect to our live table tracker. We usually have walk-in space available! 🏨";

            case 'order_status':
                const token = localStorage.getItem('token');
                if (!token) return "We don't know who you are just yet! Please log in to securely track your personal order status. 🔒";

                const accountData = await fetchDataAPI('/api/customer/account');

                if (accountData && accountData.orders && accountData.orders.length > 0) {
                    const activeOrder = accountData.orders.find(o => !['COMPLETED', 'CANCELLED'].includes(o.order_status));
                    if (activeOrder) {
                        chatContext.current.activeOrder = activeOrder.id;
                        if (activeOrder.order_status === 'PREPARING') {
                            return `Your order #${activeOrder.id} is currently being prepared 🍳. It will be ready in a few minutes.`;
                        }
                        return `Your order #${activeOrder.id} is currently ${activeOrder.order_status} 📦. Please hang tight!`;
                    }
                    return "You don don't have any active orders right now. Can I help you browse the menu? 🍔";
                }
                return "I couldn't find any recent orders for you. Have you placed one recently? 🧐";

            case 'order':
                if (chatContext.current.lastIntent === 'order' && text.includes('cancel')) {
                    return "To cancel an active order, please go to your Profile > My Orders section and simply hit the cancel button if it is still pending! 🚫";
                }
                return "I can help you place an order! You can browse the Menu page to add items to your cart, or track your existing orders from your Profile. 🍕";

            case 'billing':
                return "You can pay your bill securely via the 'checkout' page online, or simply scan the QR code at your table to pay via Card or Cash directly. 💳🧾";

            case 'service':
                return "If you're seated at a table, you can notify a steward directly using the 'Call Steward' button under your QR session. They will assist you immediately! 🤵‍♂️";

            case 'help':
                return "I'm your smart assistant! I can check tables, find out order statuses, and recommend the best dishes. Try asking me 'Are there any tables free?' or 'Where is my order?' 🤖";

            default:
                return "I'm not sure, but I can help with live orders, tables, and the menu 😊 Could you please be a bit more specific?";
        }
    };

    const processMessage = async (text) => {
        const userMsg = { id: `user-${Date.now()}`, sender: 'user', text };

        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);
        scrollToBottom("smooth", true);

        // Fetch AI response with an artificial delay for realism
        const minDelay = new Promise(resolve => setTimeout(resolve, 800));
        const aiResponsePromise = getAIResponse(text);

        const [aiResponseText] = await Promise.all([aiResponsePromise, minDelay]);

        const aiMsg = {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: aiResponseText,
        };

        setMessages((prev) => {
            if (prev.some(m => m.id === aiMsg.id)) return prev;
            return [...prev, aiMsg];
        });

        setIsTyping(false);
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
                    <div
                        ref={chatContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-black/20 pb-24"
                    >
                        {messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            >
                                <div
                                    className={`max-w-[85%] border px-5 py-3 rounded-2xl text-sm md:text-base whitespace-pre-line shadow-sm ${msg.sender === 'user'
                                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-black font-medium rounded-tr-none border-transparent shadow-[#D4AF37]/20'
                                        : 'bg-white/10 text-white font-light rounded-tl-none border-white/5 backdrop-blur-md'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Smart Practice Questions */}
                        {messages.length <= 3 && !isTyping && (
                            <div className="flex flex-col gap-3 mt-8 animate-fade-in pl-2">
                                <span className="text-[11px] text-gray-400 uppercase tracking-widest font-semibold">SUGGESTED FOR YOU</span>
                                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                                    <button
                                        onClick={() => handleQuickQuestion('Where is my order?')}
                                        className="text-sm bg-[#1A1A1A]/80 border border-white/10 hover:border-[#D4AF37]/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-full transition-all duration-300 text-left flex items-center gap-2 group"
                                    >
                                        <span className="text-[#D4AF37] group-hover:scale-110 transition-transform">🔍</span>
                                        Check my order
                                    </button>
                                    <button
                                        onClick={() => handleQuickQuestion('Any table free?')}
                                        className="text-sm bg-[#1A1A1A]/80 border border-white/10 hover:border-[#D4AF37]/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-full transition-all duration-300 text-left flex items-center gap-2 group"
                                    >
                                        <span className="text-[#D4AF37] group-hover:scale-110 transition-transform">🪑</span>
                                        Available tables
                                    </button>
                                    <button
                                        onClick={() => handleQuickQuestion('Book a table')}
                                        className="text-sm bg-[#1A1A1A]/80 border border-white/10 hover:border-[#D4AF37]/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-full transition-all duration-300 text-left flex items-center gap-2 group"
                                    >
                                        <span className="text-[#D4AF37] group-hover:scale-110 transition-transform">📅</span>
                                        Book a table
                                    </button>
                                    <button
                                        onClick={() => handleQuickQuestion('Today\'s specials')}
                                        className="text-sm bg-[#1A1A1A]/80 border border-white/10 hover:border-[#D4AF37]/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-full transition-all duration-300 text-left flex items-center gap-2 group"
                                    >
                                        <span className="text-[#D4AF37] group-hover:scale-110 transition-transform">✨</span>
                                        Today's specials
                                    </button>
                                </div>
                            </div>
                        )}

                        {isTyping && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="bg-white/5 text-gray-400 px-5 py-4 rounded-2xl rounded-tl-none border border-white/5 flex gap-2 items-center">
                                    <span className="text-xs font-medium mr-1 tracking-wide">AI is thinking</span>
                                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>

                    {/* Scroll to Bottom Button */}
                    {showScrollButton && (
                        <button
                            onClick={() => scrollToBottom("smooth", true)}
                            className="absolute bottom-44 right-6 bg-black/80 border border-[#D4AF37]/50 text-[#D4AF37] p-3 rounded-full shadow-lg backdrop-blur-md hover:scale-110 hover:bg-[#D4AF37] hover:text-black transition-all z-20 animate-fade-in group"
                            aria-label="Scroll to bottom"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>
                    )}

                    {/* Quick Questions Navigation */}
                    <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-t border-white/5 bg-black/10">
                        <button onClick={() => handleQuickQuestion('Where is my order?')} className="btn-quick whitespace-nowrap">
                            📦 Check Order
                        </button>
                        <button onClick={() => handleQuickQuestion('Any table free?')} className="btn-quick whitespace-nowrap">
                            🪑 Free Tables
                        </button>
                        <button onClick={() => handleQuickQuestion('How do I book a table?')} className="btn-quick whitespace-nowrap">
                            📅 Reservations
                        </button>
                        <button onClick={() => handleQuickQuestion('Is food good today?')} className="btn-quick whitespace-nowrap">
                            👨‍🍳 Kitchen
                        </button>
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="relative p-4 md:p-6 bg-black/40 border-t border-[#D4AF37]/20 flex gap-3 z-30 backdrop-blur-md">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a question..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-gray-500 shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isTyping}
                            className="bg-[#D4AF37] hover:bg-[#E6C86E] disabled:bg-gray-700 disabled:opacity-50 text-black w-14 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#D4AF37]/20"
                        >
                            <svg className="w-6 h-6 rotate-90 transform -translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
