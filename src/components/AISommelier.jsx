import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Phone, Info, HelpCircle, ChevronRight, Sparkles } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { FAQ_DATA } from '../data/faqData';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: '¡Hola! 👋 Soy tu asistente de BiKitchen. ¿En qué puedo ayudarte hoy?', sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [showOptions, setShowOptions] = useState(true);
    const { getWhatsAppUrl } = useWhatsApp();
    const scrollRef = useRef(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleOptionClick = (question, answer) => {
        const userMsg = { id: Date.now(), text: question, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setShowOptions(false);

        setTimeout(() => {
            const botMsg = { id: Date.now() + 1, text: answer, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        }, 600);
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const userMsg = { id: Date.now(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setShowOptions(false);

        // Dynamic keyword matching from FAQ_DATA
        setTimeout(() => {
            const lowerInput = inputValue.toLowerCase();
            let response = null;

            // Search through all categories and questions
            for (const cat of FAQ_DATA) {
                for (const q of cat.questions) {
                    const questionText = q.q.toLowerCase();
                    // Direct match or partial match
                    if (lowerInput.includes(questionText) || questionText.includes(lowerInput)) {
                        response = q.a;
                        break;
                    }
                    
                    // Simple keyword matching for core terms
                    const keywords = ['puntos', 'fidelidad', 'canje', 'comprar', 'pedido', 'envío', 'entrega', 'precio', 'pack', 'keto', 'fresco'];
                    for (const kw of keywords) {
                        if (lowerInput.includes(kw) && questionText.includes(kw)) {
                            response = q.a;
                            break;
                        }
                    }
                    if (response) break;
                }
                if (response) break;
            }

            if (!response) {
                response = "Mmm, no estoy seguro de tener esa información exacta. Pero podés preguntarme sobre 'puntos/fidelidad', 'cómo comprar', 'envíos' o los 'packs'. También podés hablar con un humano por WhatsApp.";
            }

            const botMsg = { id: Date.now() + 1, text: response, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        }, 1000);
    };

    const quickOptions = [
        { q: '¿Cómo comprar?', a: '¡Es fácil! 1. Elegís tu pack. 2. Cocinamos fresco. 3. Te entregamos los Lunes, Miércoles o Sábados. 4. ¡Calentás y disfrutás!' },
        { q: '¿Qué son los BiPuntos?', a: 'Es nuestro programa de premios. Ganás puntos por comprar o cumplir misiones y los canjeás por comida gratis o descuentos.' },
        { q: '¿Cuándo entregan?', a: 'Entregamos Lunes, Miércoles y Sábados según tu zona. Recordá pedir antes del cierre (Viernes, Lunes o Jueves 10pm).' }
    ];

    return (
        <div className="fixed bottom-6 left-6 z-[100] font-sans">
            <AnimatePresence>
                {isOpen ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 100, x: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 100, x: -20 }}
                        className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 w-[350px] md:w-[400px] overflow-hidden flex flex-col mb-4"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg leading-none mb-1">Asistente BiKitchen</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">En línea</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div 
                            ref={scrollRef}
                            className="h-[400px] overflow-y-auto p-6 bg-gray-50 flex flex-col gap-4 scroll-smooth"
                        >
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, x: msg.sender === 'bot' ? -10 : 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm ${
                                        msg.sender === 'user' 
                                            ? 'bg-orange-600 text-white rounded-tr-none' 
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}

                            {showOptions && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1">Preguntas comunes</p>
                                    {quickOptions.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleOptionClick(opt.q, opt.a)}
                                            className="text-left bg-orange-50 hover:bg-orange-100 text-orange-700 p-3 rounded-xl border border-orange-100 transition-all text-xs font-bold flex items-center justify-between group"
                                        >
                                            {opt.q}
                                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Escribe tu consulta..."
                                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <button 
                                    onClick={handleSend}
                                    className="w-11 h-11 bg-orange-600 text-white rounded-xl flex items-center justify-center hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            
                            <a
                                href={getWhatsAppUrl('Hola, necesito ayuda personalizada 🥗')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-2 text-[10px] font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-widest"
                            >
                                <Phone size={12} />
                                O habla por WhatsApp
                            </a>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        layoutId="bubble"
                        onClick={() => setIsOpen(true)}
                        className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group relative"
                    >
                        <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 group-hover:opacity-40 animate-pulse"></div>
                        <MessageCircle size={30} className="relative z-10" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
