import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Phone, Sparkles, ChevronRight, Bot } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';

// ─── System Prompt: contexto completo de BiKitchen ───────────────────────────
const BIKITCHEN_CONTEXT = `Eres el asistente virtual de BiKitchen, una empresa costarricense de meal prep saludable.
Tu nombre es "Biki" y eres amigable, cercano y usas emojis corregidamente.
Responde SIEMPRE en español. Sé conciso pero informativo.

🛒 PROCESO DE COMPRA:
Si el cliente quiere comprar, explicalo así:
1. Ir a la sección de "Planes Semanales" o "Platos Individuales".
2. Elegir el pack o platos preferidos y añadirlos al carrito.
3. El pago se hace 100% online (SINPE, Transferencia o Tarjeta) al finalizar el pedido.

🍽️ PLANES SEMANALES (Precios en ₡):
Menciona SIEMPRE el precio semanal primero.
- TWO PACK (Para 2 personas): Sin Carbos (₡49k), Bajo Calorías (₡51.7k), Regular/Tico (₡55.7k), Keto/Full (₡67.8k).
- 5 COMIDAS (Lunes a Viernes): Sin Carbos (₡24.5k), Bajo Calorías (₡25.8k), Regular/Tico/Vegetariano (₡27.8k), Keto/Full (₡33.9k).
- ALMUERZO Y CENA (10 Platos): Precios inician desde ₡49k (Sin Carbos).
- PACK FAMILIAR: Premium (₡41.5k), Deluxe (₡47.5k).

📅 CIERRES DE PEDIDOS (CRÍTICO):
- Lunes entrega -> Cierra Viernes 10pm.
- Miércoles entrega -> Cierra Lunes 10pm.
- Sábado entrega -> Cierra Jueves 10pm.

📍 ENVÍOS:
Llegamos a todo el GAM y Alajuela. El costo varía según la ubicación exacta.
Los planes MENSUALES tienen 50% de DESCUENTO en el envío.

✨ FORMATO DE RESPUESTA:
- Usa listas con viñetas para precios o pasos.
- Usa negritas (**texto**) para resaltar precios o nombres de packs.
- Sé muy servicial y si el cliente parece confundido, invitalo a escribir por WhatsApp al +506 8888-8888.`;

// ─── Preguntas predeterminadas ────────────────────────────────────────────────
const QUICK_QUESTIONS = [
    { label: '📦 ¿Qué packs tienen?', q: '¿Qué tipos de packs tienen disponibles?' },
    { label: '💰 ¿Cuánto cuesta el Keto?', q: '¿Cuánto cuesta el Pack Keto?' },
    { label: '🚚 ¿Hacen envíos a mi zona?', q: '¿A qué zonas hacen envíos y cuánto cuesta?' },
    { label: '⏰ ¿Cuándo cierran pedidos?', q: '¿Cuándo cierran los pedidos?' },
    { label: '🌟 ¿Qué son los BiPuntos?', q: '¿Cómo funciona el programa de BiPuntos?' },
    { label: '🥗 ¿Tienen opción saludable?', q: '¿Tienen packs para bajar de peso o comer saludable?' },
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [showLabel, setShowLabel] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: '¡Hola! 👋 Soy **Biki**, tu asistente de BiKitchen. ¿En qué puedo ayudarte hoy?',
            sender: 'bot',
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showQuickQ, setShowQuickQ] = useState(true);
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const { getWhatsAppUrl } = useWhatsApp();

    // History for Gemini multi-turn (exclude first greeting)
    const conversationHistory = useRef([]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Auto-show label on mount for a few seconds
    useEffect(() => {
        const show = setTimeout(() => setShowLabel(true), 2000);
        const hide = setTimeout(() => setShowLabel(false), 6000);
        return () => { clearTimeout(show); clearTimeout(hide); };
    }, []);

    // ── Send to Gemini with streaming ──────────────────────────────────────────
    const sendToGemini = async (userText) => {
        setIsTyping(true);
        setError(null);

        // Add user turn to history
        conversationHistory.current.push({
            role: 'user',
            parts: [{ text: userText }],
        });

        // Placeholder bot message for streaming
        const botMsgId = Date.now() + 1;
        setMessages((prev) => [...prev, { id: botMsgId, text: '', sender: 'bot', streaming: true }]);

        try {
            const body = {
                system_instruction: { parts: [{ text: BIKITCHEN_CONTEXT }] },
                contents: conversationHistory.current,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800,
                },
            };

            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = ''; // Buffer for partial lines

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split('\n');
                
                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
                    
                    const data = cleanLine.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const part = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (part) {
                            fullText += part;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === botMsgId ? { ...m, text: fullText } : m
                                )
                            );
                        }
                    } catch (e) {
                        // If JSON is incomplete, add back to buffer for next chunk
                        buffer = line + '\n' + buffer;
                    }
                }
            }

            // Finalize the message (remove streaming flag)
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === botMsgId ? { ...m, text: fullText || '...', streaming: false } : m
                )
            );

            // Save bot turn to history
            conversationHistory.current.push({
                role: 'model',
                parts: [{ text: fullText }],
            });
        } catch (err) {
            console.error('Gemini error:', err);
            setError('No pude conectarme. Intentá de nuevo o escribinos por WhatsApp.');
            setMessages((prev) => prev.filter((m) => m.id !== botMsgId));
        } finally {
            setIsTyping(false);
        }
    };

    // ── Handle send ────────────────────────────────────────────────────────────
    const handleSend = async (text) => {
        const msg = (text || inputValue).trim();
        if (!msg || isTyping) return;

        setInputValue('');
        setShowQuickQ(false);
        setMessages((prev) => [...prev, { id: Date.now(), text: msg, sender: 'user' }]);
        await sendToGemini(msg);
    };

    // ── Render markdown-lite (bold **text**, bullet points) ─────────────────────
    const renderText = (text) => {
        // Handle line breaks first
        const lines = text.split('\n');
        return lines.map((line, lineIdx) => {
            // Check if it's a list item
            const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('• ');
            const content = isListItem ? line.trim().substring(2) : line;

            // Handle bold parts
            const parts = content.split(/(\*\*[^*]+\*\*)/g);
            const renderedContent = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-gray-900 font-black">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            });

            return (
                <div key={lineIdx} className={`${isListItem ? 'flex gap-2 ml-1 my-0.5' : 'mb-1.5'}`}>
                    {isListItem && <span className="text-orange-500 mt-1 flex-shrink-0">•</span>}
                    <div className="flex-1">{renderedContent}</div>
                </div>
            );
        });
    };

    return (
        <div className="fixed bottom-24 md:bottom-8 left-6 z-[100] font-sans">
            <AnimatePresence>
                {isOpen ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 80, x: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 80, x: -10 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="bg-white rounded-[2rem] shadow-[0_24px_64px_rgba(0,0,0,0.18)] border border-gray-100 w-[350px] md:w-[410px] overflow-hidden flex flex-col mb-4 max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white relative flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                    <Sparkles size={22} />
                                </div>
                                <div>
                                    <h3 className="font-black text-base leading-none mb-1">Biki · Asistente BiKitchen</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                                        <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                                            Con IA · Siempre disponible
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-5 right-5 bg-white/15 hover:bg-white/25 p-2 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-5 bg-gray-50 flex flex-col gap-3 scroll-smooth min-h-0"
                            style={{ maxHeight: '380px' }}
                        >
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                                >
                                    {msg.sender === 'bot' && (
                                        <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-orange-500 text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.streaming && msg.text === '' ? (
                                            <span className="flex gap-1 items-center h-4">
                                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                        ) : (
                                            renderText(msg.text)
                                        )}
                                        {msg.streaming && msg.text !== '' && (
                                            <span className="inline-block w-1 h-3.5 bg-orange-400 ml-0.5 animate-pulse rounded-sm align-middle" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Error */}
                            {error && (
                                <div className="text-center text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
                                    {error}
                                </div>
                            )}

                            {/* Quick questions */}
                            {showQuickQ && !isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col gap-1.5 mt-1"
                                >
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-1">
                                        Preguntas frecuentes
                                    </p>
                                    {QUICK_QUESTIONS.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(opt.q)}
                                            className="text-left bg-orange-50 hover:bg-orange-100 text-orange-700 px-3.5 py-2.5 rounded-xl border border-orange-100 transition-all text-xs font-bold flex items-center justify-between group"
                                        >
                                            {opt.label}
                                            <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Escribí tu pregunta..."
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 font-medium transition-all"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                                    disabled={isTyping}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isTyping || !inputValue.trim()}
                                    className="w-11 h-11 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <Send size={17} />
                                </button>
                            </div>
                            <a
                                href={getWhatsAppUrl('Hola, necesito ayuda personalizada 🥗')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black text-gray-400 hover:text-green-600 transition-colors uppercase tracking-widest"
                            >
                                <Phone size={11} />
                                O habla por WhatsApp
                            </a>
                        </div>
                    </motion.div>
                ) : (
                    <div className="relative">
                        {/* Label animado — absolute, NO mueve el botón */}
                        <AnimatePresence>
                            {showLabel && (
                                <motion.div
                                    initial={{ opacity: 0, x: 8, scale: 0.85 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 8, scale: 0.85 }}
                                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                                    className="absolute bottom-14 left-0 bg-white text-gray-800 text-xs font-black px-3.5 py-2 rounded-2xl shadow-xl border border-gray-100 whitespace-nowrap flex items-center gap-1.5 pointer-events-none"
                                >
                                    <span>👋</span>
                                    <span>¡Hola! Soy Biki</span>
                                    {/* Arrow down */}
                                    <div className="absolute -bottom-2 left-5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            onClick={() => { setIsOpen(true); setShowLabel(false); }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.92 }}
                            onHoverStart={() => setShowLabel(true)}
                            onHoverEnd={() => setShowLabel(false)}
                            className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl relative"
                        >
                            <div className="absolute inset-0 bg-orange-400 blur-lg opacity-20 animate-pulse rounded-2xl" />
                            <MessageCircle size={22} className="relative z-10" />
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full z-20" />
                        </motion.button>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
