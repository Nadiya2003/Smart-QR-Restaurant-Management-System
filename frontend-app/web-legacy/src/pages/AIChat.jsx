import { useState } from 'react';
import GlassCard from '../components/GlassCard';

/**
 * AIChat Page - AI Assistant Interface
 * Features:
 * - Clean chat UI with glassmorphism
 * - Quick question buttons
 * - Mock responses
 */
function AIChat() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: 'Hello! I am your Melissas Food Court assistant. How can I help you today? 🤖',
        },
    ]);
    const [inputText, setInputText] = useState('');

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        // Add user message
        const userMsg = { id: Date.now(), sender: 'user', text: inputText };
        setMessages((prev) => [...prev, userMsg]);
        setInputText('');

        // Simulate AI response
        setTimeout(() => {
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: 'I am a demo AI. For real assistance, please call our hotline at 077 123 4567. 📞',
            };
            setMessages((prev) => [...prev, aiMsg]);
        }, 1000);
    };

    const handleQuickQuestion = (question) => {
        // Add user message
        const userMsg = { id: Date.now(), sender: 'user', text: question };
        setMessages((prev) => [...prev, userMsg]);

        // Determine response based on question
        let responseText = '';
        if (question.includes('opening hours')) {
            responseText = 'We are open daily from 11:00 AM to 11:00 PM. 🕚';
        } else if (question.includes('Sri Lankan')) {
            responseText = 'Yes! We serve authentic Sri Lankan dishes like Kottu, Hoppers, and Rice & Curry. 🍛';
        } else if (question.includes('book a table')) {
            responseText = 'You can book a table easily through our Reservation page in the menu! 📅';
        } else {
            responseText = 'I can help with that! Please check our menu or call us directly.';
        }

        setTimeout(() => {
            const aiMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: responseText,
            };
            setMessages((prev) => [...prev, aiMsg]);
        }, 1000);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-8 flex flex-col">
            <div className="container mx-auto max-w-4xl flex-1 flex flex-col h-full">
                <h1 className="text-3xl font-bold text-center text-white mb-8">AI Assistant</h1>

                <GlassCard className="flex-1 flex flex-col h-[600px] mb-4 overflow-hidden relative">
                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto space-y-4 p-4 mb-4 custom-scrollbar">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}
                            >
                                {msg.text}
                            </div>
                        ))}
                    </div>

                    {/* Quick Questions */}
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto mb-4 scrollbar-hide">
                        <button
                            onClick={() => handleQuickQuestion('What are your opening hours?')}
                            className="whitespace-nowrap bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] transition-all"
                        >
                            🕒 Opening Hours
                        </button>
                        <button
                            onClick={() => handleQuickQuestion('Do you have Sri Lankan food?')}
                            className="whitespace-nowrap bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] transition-all"
                        >
                            🍛 Sri Lankan Food
                        </button>
                        <button
                            onClick={() => handleQuickQuestion('How do I book a table?')}
                            className="whitespace-nowrap bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] transition-all"
                        >
                            📅 Book Table
                        </button>
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 input-glass"
                        />
                        <button
                            type="submit"
                            className="bg-[#D4AF37] hover:bg-[#E6C86E] text-black w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        >
                            ➤
                        </button>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
}

export default AIChat;
