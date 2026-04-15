import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import config from '../config';

/**
 * AIChat – Melissa's Smart Restaurant Assistant (Enhanced v2)
 * Features:
 *  - Intent classification w/ context memory
 *  - Live table availability
 *  - Live menu with specials
 *  - Order status tracking (logged-in users)
 *  - Reservation guidance with booking links
 *  - QR payment walkthrough
 *  - Inventory insights (staff only)
 *  - Natural language understanding
 *  - Smart quick-action chips
 */

const QUICK_CHIPS = [
    { icon: '🔍', label: 'Track Order',      q: 'Where is my order?' },
    { icon: '🪑', label: 'Tables',           q: 'Any table available?' },
    { icon: '📅', label: 'Book a Table',     q: 'How do I book a table?' },
    { icon: '🍽️', label: "Today's Menu",    q: "What's on the menu today?" },
    { icon: '💳', label: 'Pay by QR',        q: 'How do I pay by QR code?' },
    { icon: '📦', label: 'Order Status',     q: 'What is my order status?' },
    { icon: '✨', label: 'Specials',         q: "What are today's specials?" },
    { icon: '❓', label: 'Help',             q: 'What can you do?' },
];

// ── Intent detection ──────────────────────────────────────────
const classifyIntent = (text) => {
    const t = text.toLowerCase();
    if (/table|seat|available|free table|find.*table|table for \d|capacity/.test(t)) return 'table';
    if (/reservation|book|reserve|date.*time|dining time|slot/.test(t))             return 'reservation';
    if (/my order|track.*order|order status|where.*order|how long.*order/.test(t)) return 'order_status';
    if (/order|food|menu|dish|what.*(have|available)|specials?|recommend|best/.test(t)) return 'menu';
    if (/pay|payment|qr|bill|how to pay|receipt|method/.test(t))                   return 'payment';
    if (/cancel|modify|change|edit|refund/.test(t))                                 return 'modify';
    if (/delivery|takeaway|pickup|takeout|deliver/.test(t))                         return 'delivery';
    if (/hour|open|close|timing|schedule|location/.test(t))                         return 'info';
    if (/inventory|stock|restock|low stock/.test(t))                               return 'inventory';
    if (/help|guide|what can|what do you/.test(t))                                  return 'help';
    return null;
};

function AIChat() {
    const [messages, setMessages] = useState([
        {
            id: 'msg-init',
            sender: 'ai',
            text: "Hello! I'm **Melissa**, your smart restaurant assistant 👋\n\nI can help you with:\n🪑 Table availability & reservations\n🍽️ Menu & today's specials\n📦 Order tracking\n💳 QR payment guide\n\nHow can I assist you today?",
            chips: ['Check tables', "Today's menu", 'Book a table', 'Track order']
        },
    ]);

    const [inputText, setInputText]     = useState('');
    const [isTyping, setIsTyping]       = useState(false);
    const [showScroll, setShowScroll]   = useState(false);
    const [menuHighlights, setMenuHighlights] = useState([]);

    const chatRef       = useRef(null);
    const isScrolling   = useRef(false);
    const contextRef    = useRef({ lastIntent: null, activeOrder: null });

    // Fetch menu highlights on mount for richer suggestions
    useEffect(() => {
        window.scrollTo(0, 0);
        (async () => {
            try {
                const res = await fetch(`${config.API_BASE_URL}/api/menu`);
                if (res.ok) {
                    const data = await res.json();
                    const items = Array.isArray(data) ? data : (data.items || []);
                    setMenuHighlights(items.filter(i => i.is_active).slice(0, 5));
                }
            } catch {}
        })();
    }, []);

    const handleScroll = () => {
        if (!chatRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
        isScrolling.current = !nearBottom;
        setShowScroll(!nearBottom);
    };

    const scrollToBottom = (force = false) => {
        if (!chatRef.current || (isScrolling.current && !force)) return;
        requestAnimationFrame(() => {
            chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
        });
        setShowScroll(false);
        if (force) isScrolling.current = false;
    };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    // ── Context-aware API calls ───────────────────────────────
    const api = async (endpoint, opts = {}) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${config.API_BASE_URL}${endpoint}`, {
                ...opts,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(opts.headers || {})
                }
            });
            return res.ok ? await res.json() : null;
        } catch { return null; }
    };

    // ── Smart AI Response Engine ──────────────────────────────
    const getResponse = async (inputText) => {
        const intent = classifyIntent(inputText) || contextRef.current.lastIntent || 'help';
        contextRef.current.lastIntent = intent;

        // Use AI assistant backend for richer responses
        const aiRes = await api('/api/ai-assistant/chat', {
            method: 'POST',
            body: JSON.stringify({ message: inputText, context: contextRef.current })
        });

        if (aiRes?.response) {
            return {
                text: aiRes.response,
                chips: aiRes.suggestions || [],
                data: aiRes.data || null,
                intent: aiRes.intent
            };
        }

        // Local fallback responses
        switch (intent) {
            case 'table': {
                const tabData = await api('/api/reservations/availability?date=' + new Date().toISOString().split('T')[0] + '&time=' + new Date().toTimeString().substring(0, 5));
                const count = tabData?.tables?.filter(t => t.current_status === 'available').length;
                if (count > 0) return { text: `We currently have **${count} tables available** right now 🪑\nWould you like to make a reservation?`, chips: ['Reserve a table', 'Table for 2', 'Table for 4', 'What areas?'] };
                return { text: `All tables are currently occupied, but new ones free up often! You can check the Reservations page for live updates or book for a later time.`, chips: ['Book for tonight', 'Book for tomorrow', 'Reservation page'] };
            }
            case 'menu': {
                if (menuHighlights.length > 0) {
                    const list = menuHighlights.map(i => `• **${i.name}** — Rs. ${i.price}`).join('\n');
                    return { text: `Here are some of today's highlights 🍽️\n\n${list}\n\nVisit our Menu page for the full selection!`, chips: ['Vegetarian options', 'Best sellers', 'Beverages', 'Desserts'] };
                }
                return { text: `We offer a wide variety of fresh dishes daily! 🍔🍕🥘\nCheck our Menu page for the full list with images.`, chips: ['View full menu'] };
            }
            case 'payment':
                return {
                    text: `**Payment options at Melissa's Food Court** 💳\n\n**QR Payment (Recommended):**\n1. Ask your steward or scan the table QR\n2. Confirm amount on screen\n3. Pay via your banking app\n4. Show confirmation to staff\n\n**Other methods:**\n• 💵 Cash at counter\n• 💳 Card payment\n• 📱 Digital wallets\n\nQR payments are instant and contactless!`,
                    chips: ['How to scan QR?', 'Is card accepted?', 'Pay online']
                };
            case 'reservation':
                return {
                    text: `**Making a Reservation** 📅\n\n1. Go to our **Reservations** page\n2. Select date & time\n3. Choose number of guests\n4. Pick an available table\n5. Confirm booking!\n\nOr tell me:\n• How many guests?\n• Preferred date & time?\n\nI'll guide you step by step!`,
                    chips: ['Reserve for tonight', 'Reserve for weekend', 'Party booking', 'How many guests?']
                };
            case 'delivery':
                return {
                    text: `**Delivery & Takeaway** 🚀\n\n• **Delivery**: Order online, we deliver to your doorstep\n• **Takeaway**: Order online & pick up at the counter\n\n**Delivery areas**: Within 10km of Melissa's Food Court\n**ETA**: 30–45 minutes typically\n\nWould you like to place an order?`,
                    chips: ['Place delivery order', 'Takeaway options', 'Delivery ETA', 'Delivery zones']
                };
            case 'info':
                return {
                    text: `**Melissa's Food Court** 🏪\n\n⏰ **Hours**: 10:00 AM – 11:00 PM (Daily)\n📍 **Location**: Our main dining hall with Kitchen & Bar sections\n📞 **Contact**: Available in our Contact page\n🌐 **Orders**: Online or via QR at your table\n\nIs there anything specific I can help you with?`,
                    chips: ['Get directions', 'Contact us', 'Reservation', 'Menu']
                };
            case 'order_status': {
                const token = sessionStorage.getItem('token');
                if (!token) return { text: `Please **log in** to track your order in real-time 🔒\n\nOnce logged in, I can show you:\n• Current order status\n• Estimated time\n• Order history`, chips: ['Login', 'Guest order tracking'] };
                const acc = await api('/api/customer/account');
                const active = acc?.orders?.find(o => !['COMPLETED', 'CANCELLED'].includes(o.order_status));
                if (active) return { text: `Your order **#${active.id}** is currently **${active.order_status}** 📦\n\n${active.order_status === 'PREPARING' ? '👨‍🍳 Our chefs are preparing your meal!' : ''}${active.order_status === 'READY' ? '✅ Your order is ready!' : ''}${active.type ? `\nOrder type: ${active.type}` : ''}`, chips: ['More order details', 'Cancel order', 'Contact staff'] };
                return { text: `You don't have any active orders right now. Want to place one? 🍔`, chips: ['View menu', 'Place order', 'Past orders'] };
            }
            case 'modify':
                return { text: `**To modify or cancel an order** 🔄\n\n• Go to **Profile → My Orders**\n• Select your order\n• Click **Cancel** (only available for Pending orders)\n\n⚠️ Once order moves to "Preparing", changes are not possible.\n\nFor urgent issues, contact our team directly.`, chips: ['My orders', 'Contact staff', 'Refund policy'] };
            case 'inventory':
                return { text: `Inventory information is available to **management staff** only.\n\nIf you're staff, please check the **Inventory Dashboard** in the app for real-time stock levels and AI insights.`, chips: ['Staff login', 'Help'] };
            default:
                return { text: `I'm not sure how to help with that, but here's what I can do 😊\n\n🪑 Check table availability\n🍽️ Show today's menu\n📦 Track your order\n💳 Guide payment\n📅 Help with reservations\n\nWhat would you like?`, chips: ['Tables', 'Menu', 'Order', 'Payment'] };
        }
    };

    const processMessage = async (text) => {
        const userMsg = { id: `u-${Date.now()}`, sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);
        scrollToBottom(true);

        const [response] = await Promise.all([
            getResponse(text),
            new Promise(r => setTimeout(r, 600))
        ]);

        const aiMsg = {
            id: `a-${Date.now()}`,
            sender: 'ai',
            text: response.text,
            chips: response.chips || [],
            data: response.data || null
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        const t = inputText.trim();
        if (!t || isTyping) return;
        setInputText('');
        processMessage(t);
    };

    // ── Render a single message ───────────────────────────────
    const renderMessage = (msg) => {
        const isUser = msg.sender === 'user';

        // Render bold markdown (simplistic)
        const renderText = (text) => {
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return parts.map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                    ? <span key={i} className="font-bold">{part.slice(2, -2)}</span>
                    : part
            );
        };

        return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-black text-sm font-bold flex-shrink-0 mr-2 mt-1">
                        M
                    </div>
                )}
                <div className="max-w-[82%]">
                    <div
                        className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line shadow-sm ${
                            isUser
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#E6C86E] text-black font-medium rounded-tr-none'
                                : 'bg-white/10 text-white font-light rounded-tl-none border border-white/5 backdrop-blur-md'
                        }`}
                    >
                        {renderText(msg.text)}
                    </div>

                    {/* Action chips */}
                    {msg.chips?.length > 0 && !isUser && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pl-1">
                            {msg.chips.map((chip, i) => (
                                <button
                                    key={i}
                                    onClick={() => { if (!isTyping) processMessage(chip); }}
                                    className="text-xs bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 text-[#D4AF37] px-3 py-1.5 rounded-full transition-all duration-200"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Data cards for tables/menu */}
                    {msg.data?.available_tables?.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 max-w-xs">
                            {msg.data.available_tables.slice(0, 4).map(t => (
                                <div key={t.id} className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-green-400">
                                    <div className="font-bold">Table {t.table_number}</div>
                                    <div>{t.area_name || 'Main'} · {t.capacity} seats</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {msg.data?.featured_items?.length > 0 && (
                        <div className="mt-2 space-y-1 max-w-xs">
                            {msg.data.featured_items.slice(0, 3).map(item => (
                                <div key={item.name} className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-3 py-2 text-xs">
                                    <span className="text-[#D4AF37] font-semibold">{item.name}</span>
                                    <span className="text-gray-400 ml-2">Rs. {item.price}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-8 flex flex-col items-center">
            <div className="container mx-auto max-w-4xl flex-1 flex flex-col w-full">

                {/* Title */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-4 py-1.5 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-xs text-[#D4AF37] font-medium">AI Online</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-1">Melissa AI Assistant</h1>
                    <p className="text-gray-400 text-sm">Smart support for Melissa's Food Court — tables, menus, orders & more</p>
                </div>

                {/* Quick Action Bar */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                    {QUICK_CHIPS.map((chip, i) => (
                        <button
                            key={i}
                            onClick={() => { if (!isTyping) processMessage(chip.q); }}
                            className="flex items-center gap-1.5 whitespace-nowrap bg-white/5 hover:bg-[#D4AF37]/10 border border-white/10 hover:border-[#D4AF37]/30 text-gray-300 hover:text-white text-xs px-3 py-2 rounded-full transition-all duration-200 flex-shrink-0"
                        >
                            <span>{chip.icon}</span>
                            {chip.label}
                        </button>
                    ))}
                </div>

                <GlassCard className="flex-1 flex flex-col h-[560px] md:h-[660px] overflow-hidden border-[#D4AF37]/20 relative">

                    {/* Messages */}
                    <div
                        ref={chatRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar bg-black/20"
                    >
                        {messages.map(msg => renderMessage(msg))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-black text-sm font-bold flex-shrink-0 mr-2 mt-1">M</div>
                                <div className="bg-white/5 text-gray-400 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1.5 items-center">
                                    <span className="text-xs text-gray-500 mr-1">Thinking</span>
                                    {[0, 0.2, 0.4].map((delay, i) => (
                                        <span key={i} className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="h-2" />
                    </div>

                    {/* Scroll to bottom button */}
                    {showScroll && (
                        <button
                            onClick={() => scrollToBottom(true)}
                            className="absolute bottom-24 right-5 bg-black/80 border border-[#D4AF37]/50 text-[#D4AF37] p-2.5 rounded-full shadow-lg hover:scale-110 hover:bg-[#D4AF37] hover:text-black transition-all z-20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>
                    )}

                    {/* Input */}
                    <form onSubmit={handleSend} className="relative p-4 md:p-5 bg-black/40 border-t border-[#D4AF37]/20 flex gap-3 backdrop-blur-md">
                        <input
                            type="text"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder="Ask me anything about Melissa's Food Court..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isTyping}
                            className="bg-[#D4AF37] hover:bg-[#E6C86E] disabled:bg-gray-700 disabled:opacity-40 text-black w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
                        >
                            <svg className="w-5 h-5 rotate-90 -translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </GlassCard>

                {/* Footer note */}
                <p className="text-center text-xs text-gray-600 mt-3">
                    Melissa AI responds in real-time using live restaurant data · Powered by Melissa's Food Court System
                </p>
            </div>
        </div>
    );
}

export default AIChat;
