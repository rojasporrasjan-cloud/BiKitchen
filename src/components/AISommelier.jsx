import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Brain, Zap, Coffee, Moon } from 'lucide-react';
import MagneticButton from './MagneticButton';

const moods = [
    { id: 'energetic', label: 'Energía', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
    { id: 'focused', label: 'Enfoque', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-400/20' },
    { id: 'relaxed', label: 'Relax', icon: Moon, color: 'text-purple-400', bg: 'bg-purple-400/20' },
    { id: 'cozy', label: 'Confort', icon: Coffee, color: 'text-orange-400', bg: 'bg-orange-400/20' },
];

const recommendations = {
    energetic: {
        title: "Power Bowl de Quinoa",
        desc: "Carbohidratos complejos y proteína magra para energía sostenida.",
        img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    focused: {
        title: "Salmón Omega-3",
        desc: "Ácidos grasos esenciales para potenciar tu función cognitiva.",
        img: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    relaxed: {
        title: "Ensalada Zen",
        desc: "Ingredientes ligeros y frescos para una digestión tranquila.",
        img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    },
    cozy: {
        title: "Lasaña Artesanal",
        desc: "El abrazo culinario que necesitas hoy. Calidez en cada bocado.",
        img: "https://images.unsplash.com/photo-1551183053-bf91b1d3116c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    }
};

/**
 * AISommelier Component
 * 
 * A floating widget that recommends dishes based on the user's selected mood.
 * Simulates an AI analysis process with animations.
 */
export default function AISommelier() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMood, setSelectedMood] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);

    const handleMoodSelect = (moodId) => {
        setSelectedMood(moodId);
        setIsProcessing(true);
        setResult(null);

        // Simulate AI processing
        setTimeout(() => {
            setIsProcessing(false);
            setResult(recommendations[moodId]);
        }, 2000);
    };

    const reset = () => {
        setSelectedMood(null);
        setResult(null);
        setIsProcessing(false);
    };

    return (
        <>
            {/* Floating Trigger */}
            <div className="fixed bottom-8 left-8 z-40">
                <MagneticButton
                    onClick={() => setIsOpen(true)}
                    className={`w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-colors duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    <Sparkles size={24} />
                </MagneticButton>
            </div>

            {/* Modal Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-8 left-8 z-50 w-[350px] bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white font-sans"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-accent" />
                                <span className="text-xs font-bold tracking-widest uppercase text-white/80">AI Sommelier</span>
                            </div>
                            <button onClick={() => { setIsOpen(false); reset(); }} className="text-white/50 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 min-h-[300px] flex flex-col">
                            {!selectedMood ? (
                                <>
                                    <h3 className="text-xl font-serif font-bold mb-2">¿Cómo te sientes hoy?</h3>
                                    <p className="text-white/60 text-sm mb-6">Deja que nuestra IA seleccione el plato perfecto para tu estado de ánimo.</p>

                                    <div className="grid grid-cols-2 gap-3">
                                        {moods.map((mood) => (
                                            <button
                                                key={mood.id}
                                                onClick={() => handleMoodSelect(mood.id)}
                                                className={`p-4 rounded-xl border border-white/5 hover:border-accent/50 hover:bg-white/5 transition-all group flex flex-col items-center gap-2 text-center`}
                                            >
                                                <mood.icon className={`${mood.color} group-hover:scale-110 transition-transform`} size={24} />
                                                <span className="text-sm font-medium text-white/80">{mood.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : isProcessing ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-center">
                                    <div className="relative w-16 h-16 mb-6">
                                        <div className="absolute inset-0 border-t-2 border-accent rounded-full animate-spin"></div>
                                        <div className="absolute inset-2 border-r-2 border-primary rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                                        <Brain className="absolute inset-0 m-auto text-white/20 animate-pulse" size={24} />
                                    </div>
                                    <h4 className="text-lg font-bold mb-1 animate-pulse">Analizando...</h4>
                                    <p className="text-xs text-white/50 uppercase tracking-widest">Calibrando Nutrientes</p>
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col animate-fade-in">
                                    <div className="relative h-40 rounded-lg overflow-hidden mb-4 group">
                                        <img src={result.img} alt={result.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <div className="absolute bottom-3 left-3">
                                            <span className="text-[10px] bg-accent text-black px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-1 inline-block">Recomendado</span>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-serif font-bold text-accent mb-2">{result.title}</h3>
                                    <p className="text-white/70 text-sm mb-6 leading-relaxed">{result.desc}</p>

                                    <div className="mt-auto flex gap-3">
                                        <button onClick={reset} className="flex-1 py-3 rounded-lg border border-white/20 text-sm font-bold hover:bg-white/5 transition-colors">
                                            Probar Otro
                                        </button>
                                        <a href="/menu" className="flex-1 py-3 rounded-lg bg-accent text-black text-sm font-bold hover:bg-accent/90 transition-colors flex items-center justify-center">
                                            Ver en Menú
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
