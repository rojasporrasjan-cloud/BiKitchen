import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import BackButton from '../components/BackButton';
import { 
    Clock, Utensils, Flame, Leaf, Trophy, TrendingUp,
    ArrowRight, Gift, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import SEOHead from '../components/SEOHead';

// Datos de impacto por comida
const IMPACT_PER_MEAL = {
    timeSaved: 45, // minutos
    caloriesBalanced: 550,
    co2Saved: 0.5, // kg
    waterSaved: 15, // litros
    moneySaved: 500, // colones vs comer fuera
};

// Equivalencias divertidas
const TIME_EQUIVALENCES = [
    { hours: 1, text: '1 episodio de tu serie favorita', icon: '📺' },
    { hours: 2, text: '1 película completa', icon: '🎬' },
    { hours: 3, text: '1 siesta reparadora', icon: '😴' },
    { hours: 5, text: '1 partido de fútbol', icon: '⚽' },
    { hours: 8, text: '1 día laboral', icon: '💼' },
    { hours: 24, text: '1 día completo', icon: '🌟' },
    { hours: 48, text: '1 fin de semana', icon: '🏖️' },
    { hours: 168, text: '1 semana entera', icon: '📅' },
];

// Animación de contador
const AnimatedNumber = ({ value, duration = 2000, suffix = '', decimals = 0 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const newValue = easeOutQuart * value;
            setDisplayValue(decimals > 0 ? newValue.toFixed(decimals) : Math.floor(newValue));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration, decimals]);

    return <span>{Number(displayValue).toLocaleString('es-CR')}{suffix}</span>;
};

export default function MiImpactoPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const [totalMeals, setTotalMeals] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loadingData, setLoadingData] = useState(true);

    // Cargar datos reales del usuario desde Firestore
    useEffect(() => {
        const loadUserImpact = async () => {
            // Esperar a que auth termine de cargar
            if (authLoading) return;
            
            if (!currentUser) {
                setLoadingData(false);
                return;
            }

            try {
                // Buscar pedidos completados del usuario
                const ordersRef = collection(db, 'orders');
                const q = query(
                    ordersRef,
                    where('userId', '==', currentUser.uid),
                    where('status', 'in', ['completado', 'entregado', 'pagado'])
                );
                const snapshot = await getDocs(q);
                
                let mealsCount = 0;
                let ordersCount = 0;

                snapshot.forEach((doc) => {
                    const order = doc.data();
                    ordersCount++;
                    
                    // Contar items del pedido como comidas
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            // Cada item cuenta como comidas según su cantidad
                            const qty = item.quantity || 1;
                            // Si es un pack, multiplicar por el número de comidas del pack
                            if (item.plan === 'pack-3') {
                                mealsCount += qty * 3;
                            } else if (item.plan === 'pack-5') {
                                mealsCount += qty * 5;
                            } else if (item.plan === 'desayunos') {
                                mealsCount += qty * 5; // 5 desayunos por semana
                            } else if (item.planLabel?.includes('Pack')) {
                                // Packs semanales
                                mealsCount += qty * 5;
                            } else {
                                // Platos individuales
                                mealsCount += qty;
                            }
                        });
                    }
                });

                setTotalMeals(mealsCount);
                setTotalOrders(ordersCount);
            } catch (error) {
                console.error('Error cargando impacto:', error);
            } finally {
                setLoadingData(false);
            }
        };

        loadUserImpact();
    }, [currentUser, authLoading]);

    // Calcular impacto
    const totalMinutesSaved = totalMeals * IMPACT_PER_MEAL.timeSaved;
    const totalHoursSaved = totalMinutesSaved / 60;
    const totalCalories = totalMeals * IMPACT_PER_MEAL.caloriesBalanced;
    const totalCO2Saved = totalMeals * IMPACT_PER_MEAL.co2Saved;
    const totalWaterSaved = totalMeals * IMPACT_PER_MEAL.waterSaved;
    const totalMoneySaved = totalMeals * IMPACT_PER_MEAL.moneySaved;

    // Nivel del usuario
    const getLevel = (meals) => {
        if (meals >= 500) return { name: 'Leyenda BiKitchen', icon: '👑', color: 'from-yellow-400 to-amber-500', next: null };
        if (meals >= 200) return { name: 'Chef Experto', icon: '🏆', color: 'from-purple-500 to-indigo-500', next: 500 };
        if (meals >= 100) return { name: 'Foodie Pro', icon: '⭐', color: 'from-blue-500 to-cyan-500', next: 200 };
        if (meals >= 50) return { name: 'Comensal Frecuente', icon: '🔥', color: 'from-orange-500 to-red-500', next: 100 };
        if (meals >= 20) return { name: 'Explorador', icon: '🌟', color: 'from-green-500 to-emerald-500', next: 50 };
        if (meals >= 5) return { name: 'Principiante', icon: '🌱', color: 'from-green-400 to-teal-400', next: 20 };
        return { name: 'Nuevo', icon: '👋', color: 'from-gray-400 to-gray-500', next: 5 };
    };

    const level = getLevel(totalMeals);
    const progressToNext = level.next ? Math.min((totalMeals / level.next) * 100, 100) : 100;

    // Logros
    const achievements = [
        { id: 1, name: 'Primera Comida', icon: '🎉', requirement: 1, unlocked: totalMeals >= 1 },
        { id: 2, name: '5 Comidas', icon: '🌟', requirement: 5, unlocked: totalMeals >= 5 },
        { id: 3, name: '10 Almuerzos y Cenas', icon: '✨', requirement: 10, unlocked: totalMeals >= 10 },
        { id: 4, name: '20 Comidas', icon: '🔥', requirement: 20, unlocked: totalMeals >= 20 },
        { id: 5, name: '50 Comidas', icon: '⭐', requirement: 50, unlocked: totalMeals >= 50 },
        { id: 6, name: '100 Comidas', icon: '🏆', requirement: 100, unlocked: totalMeals >= 100 },
        { id: 7, name: '1 Hora Ahorrada', icon: '⏰', requirement: 'time', unlocked: totalHoursSaved >= 1 },
        { id: 8, name: '1 Día Ahorrado', icon: '📅', requirement: 'time', unlocked: totalHoursSaved >= 24 },
        { id: 9, name: '1 Semana Ahorrada', icon: '🗓️', requirement: 'time', unlocked: totalHoursSaved >= 168 },
        { id: 10, name: 'Eco Warrior', icon: '🌍', requirement: 'co2', unlocked: totalCO2Saved >= 10 },
    ];

    return (
        <PageTransition>
            <SEOHead
                title="Mi Impacto — BiKitchen"
                description="Descubrí el impacto positivo de tus pedidos BiKitchen en tu salud, tiempo y el planeta."
                noindex={true}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero */}
                <section className="relative pt-32 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-bikitchen-orange/5 to-emerald-500/5"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-bikitchen-orange/20 to-emerald-500/10 rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" aria-hidden="true"></div>
                    
                    <div className="container relative z-10">
                        <BackButton className="mb-6" />

                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-6xl mb-4"
                            >
                                {level.icon}
                            </motion.div>
                            
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`inline-block bg-gradient-to-r ${level.color} text-white px-4 py-2 rounded-full text-sm font-bold mb-4`}
                            >
                                Nivel: {level.name}
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                            >
                                Tu Impacto BiKitchen
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-gray-600"
                            >
                                Descubre cuánto has logrado comiendo saludable con nosotros
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Loading o No logueado */}
                {(authLoading || loadingData) ? (
                    <section className="py-12">
                        <div className="container">
                            <div className="flex items-center justify-center gap-3 text-gray-500">
                                <Loader2 className="animate-spin" size={24} />
                                <span>Calculando tu impacto...</span>
                            </div>
                        </div>
                    </section>
                ) : !currentUser ? (
                    <section className="py-12">
                        <div className="container">
                            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 border border-gray-100 text-center">
                                <div className="text-4xl mb-4">🔐</div>
                                <h3 className="font-bold text-gray-900 mb-2">Inicia sesión para ver tu impacto</h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Necesitas una cuenta para rastrear tus comidas y logros
                                </p>
                                <Link
                                    to="/login"
                                    className="inline-block px-6 py-3 bg-bikitchen-orange text-white rounded-xl font-semibold hover:bg-bikitchen-orange-dark transition-colors"
                                >
                                    Iniciar sesión
                                </Link>
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
                    {/* Resumen del usuario */}
                    <section className="py-6">
                        <div className="container">
                            <div className="max-w-2xl mx-auto">
                                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Tu progreso</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {totalMeals} comidas • {totalOrders} pedidos
                                            </p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${level.color} text-white text-sm font-bold`}>
                                            {level.icon} {level.name}
                                        </div>
                                    </div>
                                    {level.next && (
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{totalMeals} comidas</span>
                                                <span>{level.next} para siguiente nivel</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full bg-gradient-to-r ${level.color} transition-all duration-1000`}
                                                    style={{ width: `${progressToNext}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                {/* Stats Grid */}
                <section className="py-12">
                    <div className="container">
                        <div className="max-w-5xl mx-auto">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {/* Comidas */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                                >
                                    <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Utensils size={28} className="text-orange-500" />
                                    </div>
                                    <p className="text-4xl font-bold text-orange-600 mb-1">
                                        <AnimatedNumber value={totalMeals} />
                                    </p>
                                    <p className="text-gray-600">comidas disfrutadas</p>
                                </motion.div>

                                {/* Tiempo */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                                >
                                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Clock size={28} className="text-blue-500" />
                                    </div>
                                    <p className="text-4xl font-bold text-blue-600 mb-1">
                                        <AnimatedNumber value={totalHoursSaved} decimals={1} suffix="h" />
                                    </p>
                                    <p className="text-gray-600">tiempo ahorrado</p>
                                </motion.div>

                                {/* Dinero */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                                >
                                    <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <TrendingUp size={28} className="text-green-500" />
                                    </div>
                                    <p className="text-4xl font-bold text-green-600 mb-1">
                                        ₡<AnimatedNumber value={totalMoneySaved} />
                                    </p>
                                    <p className="text-gray-600">ahorrado vs comer fuera</p>
                                </motion.div>

                                {/* Calorías */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                                >
                                    <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Flame size={28} className="text-red-500" />
                                    </div>
                                    <p className="text-4xl font-bold text-red-600 mb-1">
                                        <AnimatedNumber value={totalCalories} />
                                    </p>
                                    <p className="text-gray-600">calorías balanceadas</p>
                                </motion.div>

                                {/* CO2 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                                >
                                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Leaf size={28} className="text-emerald-500" />
                                    </div>
                                    <p className="text-4xl font-bold text-emerald-600 mb-1">
                                        <AnimatedNumber value={totalCO2Saved} decimals={1} suffix="kg" />
                                    </p>
                                    <p className="text-gray-600">CO₂ evitado</p>
                                </motion.div>

                                {/* Agua */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                                >
                                    <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">💧</span>
                                    </div>
                                    <p className="text-4xl font-bold text-cyan-600 mb-1">
                                        <AnimatedNumber value={totalWaterSaved} suffix="L" />
                                    </p>
                                    <p className="text-gray-600">agua ahorrada</p>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Achievements */}
                <section className="py-12 bg-gray-50">
                    <div className="container">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Trophy className="text-yellow-500" />
                                Logros
                            </h2>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {achievements.map((achievement) => (
                                    <motion.div
                                        key={achievement.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`bg-white rounded-xl p-4 text-center border-2 transition-all ${
                                            achievement.unlocked
                                                ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                                                : 'border-gray-200 opacity-50'
                                        }`}
                                    >
                                        <div className={`text-3xl mb-2 ${!achievement.unlocked && 'grayscale'}`}>
                                            {achievement.unlocked ? achievement.icon : '🔒'}
                                        </div>
                                        <p className={`text-sm font-medium ${
                                            achievement.unlocked 
                                                ? 'text-gray-900' 
                                                : 'text-gray-400'
                                        }`}>
                                            {achievement.name}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-12">
                    <div className="container">
                        <div className="max-w-3xl mx-auto text-center">
                            <Gift size={48} className="mx-auto text-bikitchen-orange mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                ¡Sigue sumando impacto!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Cada comida cuenta. Sigue disfrutando de comida saludable y alcanza nuevos logros.
                            </p>
                            <Link
                                to="/packs"
                                className="inline-flex items-center gap-2 bg-bikitchen-orange text-white px-8 py-4 rounded-xl font-bold hover:bg-bikitchen-orange-dark transition-colors"
                            >
                                Hacer un Pedido
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </section>
                </>
                )}

                <Footer />
            </div>
        </PageTransition>
    );
}
