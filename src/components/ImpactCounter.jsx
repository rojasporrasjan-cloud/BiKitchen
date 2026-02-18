import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Clock, Utensils, Flame, Leaf, Trophy, TrendingUp,
    Sparkles, ChefHat, Heart, Zap, X
} from 'lucide-react';

// Datos de impacto por comida
const IMPACT_PER_MEAL = {
    timeSaved: 45, // minutos ahorrados por comida (cocinar + limpiar + compras prorrateado)
    caloriesBalanced: 550, // calorías promedio balanceadas
    co2Saved: 0.5, // kg de CO2 ahorrado vs delivery tradicional
};

// Equivalencias divertidas
const TIME_EQUIVALENCES = [
    { hours: 1, text: '1 episodio de tu serie favorita', icon: '📺' },
    { hours: 2, text: '1 película completa', icon: '🎬' },
    { hours: 3, text: '1 siesta reparadora', icon: '😴' },
    { hours: 5, text: '1 partido de fútbol completo', icon: '⚽' },
    { hours: 8, text: '1 día laboral completo', icon: '💼' },
    { hours: 10, text: '1 vuelo San José - Miami', icon: '✈️' },
    { hours: 24, text: '1 día entero de tu vida', icon: '🌟' },
    { hours: 48, text: '1 fin de semana completo', icon: '🏖️' },
    { hours: 100, text: '4 días de vacaciones', icon: '🌴' },
];

const getTimeEquivalence = (hours) => {
    // Encontrar la equivalencia más cercana sin pasarse
    const sorted = [...TIME_EQUIVALENCES].sort((a, b) => b.hours - a.hours);
    for (const eq of sorted) {
        if (hours >= eq.hours) {
            const times = Math.floor(hours / eq.hours);
            return { ...eq, times };
        }
    }
    return null;
};

// Animación de contador
const AnimatedNumber = ({ value, duration = 2000, suffix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeOutQuart * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{displayValue.toLocaleString('es-CR')}{suffix}</span>;
};

export default function ImpactCounter({ 
    totalMeals = 0, 
    isOpen, 
    onClose,
    userName = 'Usuario'
}) {
    // Estado para detalles expandidos (reservado para uso futuro)
    const [, setShowDetails] = useState(false);

    // Calcular impacto
    const totalMinutesSaved = totalMeals * IMPACT_PER_MEAL.timeSaved;
    const totalHoursSaved = totalMinutesSaved / 60;
    const totalCalories = totalMeals * IMPACT_PER_MEAL.caloriesBalanced;
    const totalCO2Saved = totalMeals * IMPACT_PER_MEAL.co2Saved;
    
    // Equivalencia de tiempo
    const timeEquivalence = getTimeEquivalence(totalHoursSaved);

    // Nivel del usuario basado en comidas
    const getLevel = (meals) => {
        if (meals >= 500) return { name: 'Leyenda BiKitchen', icon: '👑', color: 'from-yellow-400 to-amber-500' };
        if (meals >= 200) return { name: 'Chef Experto', icon: '🏆', color: 'from-purple-500 to-indigo-500' };
        if (meals >= 100) return { name: 'Foodie Pro', icon: '⭐', color: 'from-blue-500 to-cyan-500' };
        if (meals >= 50) return { name: 'Comensal Frecuente', icon: '🔥', color: 'from-orange-500 to-red-500' };
        if (meals >= 20) return { name: 'Explorador', icon: '🌟', color: 'from-green-500 to-emerald-500' };
        if (meals >= 5) return { name: 'Principiante', icon: '🌱', color: 'from-green-400 to-teal-400' };
        return { name: 'Nuevo', icon: '👋', color: 'from-gray-400 to-gray-500' };
    };

    const level = getLevel(totalMeals);
    const nextLevel = getLevel(totalMeals + 50);

    // Progress to next level
    const levelThresholds = [0, 5, 20, 50, 100, 200, 500];
    const currentThresholdIndex = levelThresholds.findIndex((t, i) => 
        totalMeals >= t && (i === levelThresholds.length - 1 || totalMeals < levelThresholds[i + 1])
    );
    const currentThreshold = levelThresholds[currentThresholdIndex] || 0;
    const nextThreshold = levelThresholds[currentThresholdIndex + 1] || levelThresholds[levelThresholds.length - 1];
    const progressToNext = ((totalMeals - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`bg-gradient-to-r ${level.color} p-6 text-white relative`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="text-center">
                        <div className="text-5xl mb-2">{level.icon}</div>
                        <h2 className="text-2xl font-bold mb-1">¡Hola, {userName}!</h2>
                        <p className="text-white/80">Nivel: {level.name}</p>
                        
                        {/* Progress bar */}
                        {currentThresholdIndex < levelThresholds.length - 1 && (
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-white/70 mb-1">
                                    <span>{totalMeals} comidas</span>
                                    <span>{nextThreshold} para {nextLevel.name}</span>
                                </div>
                                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(progressToNext, 100)}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-white rounded-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="text-bikitchen-orange" size={20} />
                        Tu Impacto con BiKitchen
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Comidas */}
                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <Utensils className="mx-auto text-orange-500 mb-2" size={28} />
                            <p className="text-3xl font-bold text-orange-600">
                                <AnimatedNumber value={totalMeals} />
                            </p>
                            <p className="text-sm text-gray-600">comidas disfrutadas</p>
                        </div>

                        {/* Tiempo */}
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <Clock className="mx-auto text-blue-500 mb-2" size={28} />
                            <p className="text-3xl font-bold text-blue-600">
                                <AnimatedNumber value={Math.round(totalHoursSaved)} suffix="h" />
                            </p>
                            <p className="text-sm text-gray-600">tiempo ahorrado</p>
                        </div>

                        {/* Calorías */}
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                            <Flame className="mx-auto text-green-500 mb-2" size={28} />
                            <p className="text-3xl font-bold text-green-600">
                                <AnimatedNumber value={totalCalories} />
                            </p>
                            <p className="text-sm text-gray-600">calorías balanceadas</p>
                        </div>

                        {/* CO2 */}
                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                            <Leaf className="mx-auto text-emerald-500 mb-2" size={28} />
                            <p className="text-3xl font-bold text-emerald-600">
                                <AnimatedNumber value={Math.round(totalCO2Saved * 10) / 10} suffix="kg" />
                            </p>
                            <p className="text-sm text-gray-600">CO₂ ahorrado</p>
                        </div>
                    </div>

                    {/* Fun equivalence */}
                    {timeEquivalence && totalHoursSaved >= 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 mb-6"
                        >
                            <p className="text-center">
                                <span className="text-2xl mr-2">{timeEquivalence.icon}</span>
                                <span className="text-gray-700">
                                    Has ahorrado el equivalente a{' '}
                                    <span className="font-bold text-purple-600">
                                        {timeEquivalence.times > 1 ? `${timeEquivalence.times}× ` : ''}
                                        {timeEquivalence.text}
                                    </span>
                                </span>
                            </p>
                        </motion.div>
                    )}

                    {/* Achievements preview */}
                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Trophy size={18} className="text-yellow-500" />
                            Logros Desbloqueados
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {totalMeals >= 1 && (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                                    🎉 Primera comida
                                </span>
                            )}
                            {totalMeals >= 5 && (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                    🌟 5 comidas
                                </span>
                            )}
                            {totalMeals >= 20 && (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                                    🔥 20 comidas
                                </span>
                            )}
                            {totalMeals >= 50 && (
                                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                                    ⭐ 50 comidas
                                </span>
                            )}
                            {totalMeals >= 100 && (
                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                                    🏆 100 comidas
                                </span>
                            )}
                            {totalHoursSaved >= 24 && (
                                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                    ⏰ 1 día ahorrado
                                </span>
                            )}
                        </div>
                        
                        {/* Locked achievements */}
                        {totalMeals < 100 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {totalMeals < 50 && (
                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-sm">
                                        🔒 50 comidas
                                    </span>
                                )}
                                {totalMeals < 100 && (
                                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-sm">
                                        🔒 100 comidas
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Motivational message */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            {totalMeals === 0 
                                ? '¡Haz tu primer pedido y empieza a acumular impacto!'
                                : totalMeals < 10
                                    ? '¡Vas muy bien! Sigue disfrutando comida saludable.'
                                    : totalMeals < 50
                                        ? '¡Increíble progreso! Ya eres parte de la familia BiKitchen.'
                                        : '¡Eres un verdadero fan de BiKitchen! Gracias por confiar en nosotros.'
                            }
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Componente pequeño para mostrar en navbar o perfil
export function ImpactBadge({ totalMeals = 0, onClick }) {
    const getLevel = (meals) => {
        if (meals >= 500) return { icon: '👑', color: 'bg-yellow-500' };
        if (meals >= 200) return { icon: '🏆', color: 'bg-purple-500' };
        if (meals >= 100) return { icon: '⭐', color: 'bg-blue-500' };
        if (meals >= 50) return { icon: '🔥', color: 'bg-orange-500' };
        if (meals >= 20) return { icon: '🌟', color: 'bg-green-500' };
        if (meals >= 5) return { icon: '🌱', color: 'bg-green-400' };
        return { icon: '👋', color: 'bg-gray-400' };
    };

    const level = getLevel(totalMeals);

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${level.color} text-white text-sm font-medium hover:opacity-90 transition-opacity`}
        >
            <span>{level.icon}</span>
            <span>{totalMeals} comidas</span>
        </button>
    );
}
