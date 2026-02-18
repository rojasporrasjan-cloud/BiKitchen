import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import BackButton from '../components/BackButton';
import useLoyaltyPoints from '../hooks/useLoyaltyPoints';
import { 
    Award, Star, Gift, TrendingUp, ArrowRight, Sparkles,
    Clock, ShoppingBag, ChevronRight, Info, Zap, Crown
} from 'lucide-react';

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

export default function FidelidadPage() {
    const {
        points,
        totalEarned,
        totalRedeemed,
        history,
        currentLevel,
        nextLevel,
        progressToNextLevel,
        pointsToColones,
        config,
        levels
    } = useLoyaltyPoints();

    const [showAllHistory, setShowAllHistory] = useState(false);
    const displayHistory = showAllHistory ? history : history.slice(0, 5);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero */}
                <section className="relative pt-32 pb-12 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${currentLevel.color} opacity-5`}></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-500/15 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="container relative z-10">
                        <BackButton className="mb-6" />

                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-6xl mb-4"
                            >
                                {currentLevel.icon}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`inline-block bg-gradient-to-r ${currentLevel.color} text-white px-4 py-2 rounded-full text-sm font-bold mb-4`}
                            >
                                Nivel {currentLevel.name}
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                            >
                                Programa de Fidelidad
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-gray-600"
                            >
                                Gana puntos con cada compra y canjéalos por descuentos
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Points Card */}
                <section className="py-6 -mt-8">
                    <div className="container">
                        <div className="max-w-lg mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-gradient-to-br ${currentLevel.color} rounded-2xl p-6 text-white shadow-xl`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-white/80 text-sm">Tus puntos</p>
                                        <p className="text-4xl font-bold">{points.toLocaleString('es-CR')}</p>
                                        <p className="text-white/80 text-sm">
                                            = ₡{pointsToColones(points).toLocaleString('es-CR')} en descuentos
                                        </p>
                                    </div>
                                    <div className="text-6xl">{currentLevel.icon}</div>
                                </div>

                                {/* Progress to next level */}
                                {nextLevel && (
                                    <div>
                                        <div className="flex justify-between text-sm text-white/80 mb-2">
                                            <span>{currentLevel.name}</span>
                                            <span>{nextLevel.name} ({nextLevel.minPoints - totalEarned} pts más)</span>
                                        </div>
                                        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressToNextLevel}%` }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                                className="h-full bg-white rounded-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!nextLevel && (
                                    <div className="flex items-center gap-2 text-white/90">
                                        <Crown size={20} />
                                        <span>¡Nivel máximo alcanzado!</span>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="py-6">
                    <div className="container">
                        <div className="max-w-3xl mx-auto">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                                    <TrendingUp className="mx-auto text-green-500 mb-2" size={24} />
                                    <p className="text-2xl font-bold text-gray-900">{totalEarned.toLocaleString('es-CR')}</p>
                                    <p className="text-xs text-gray-500">Puntos ganados</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                                    <Gift className="mx-auto text-purple-500 mb-2" size={24} />
                                    <p className="text-2xl font-bold text-gray-900">{totalRedeemed.toLocaleString('es-CR')}</p>
                                    <p className="text-xs text-gray-500">Puntos canjeados</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 text-center border border-gray-100">
                                    <Zap className="mx-auto text-yellow-500 mb-2" size={24} />
                                    <p className="text-2xl font-bold text-gray-900">{currentLevel.multiplier}x</p>
                                    <p className="text-xs text-gray-500">Multiplicador</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section className="py-8">
                    <div className="container">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Info className="text-bikitchen-orange" size={24} />
                                ¿Cómo funciona?
                            </h2>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-xl p-5 border border-gray-100">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                                        <ShoppingBag size={20} className="text-green-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">1. Compra</h3>
                                    <p className="text-sm text-gray-600">
                                        Gana 1 punto por cada ₡{config.colonesPerPoint} de compra
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl p-5 border border-gray-100">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
                                        <Star size={20} className="text-yellow-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">2. Acumula</h3>
                                    <p className="text-sm text-gray-600">
                                        Sube de nivel y gana puntos más rápido con multiplicadores
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl p-5 border border-gray-100">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                                        <Gift size={20} className="text-purple-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">3. Canjea</h3>
                                    <p className="text-sm text-gray-600">
                                        Cada punto vale ₡{config.pointValue}. Mínimo {config.minRedeemPoints} puntos
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Levels */}
                <section className="py-8 bg-gray-50">
                    <div className="container">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Award className="text-bikitchen-orange" size={24} />
                                Niveles
                            </h2>

                            <div className="space-y-4">
                                {levels.map((level, index) => {
                                    const isCurrentLevel = level.name === currentLevel.name;
                                    const isUnlocked = totalEarned >= level.minPoints;
                                    
                                    return (
                                        <div
                                            key={level.name}
                                            className={`bg-white rounded-xl p-4 border-2 transition-all ${
                                                isCurrentLevel 
                                                    ? 'border-bikitchen-orange shadow-lg' 
                                                    : isUnlocked
                                                        ? 'border-green-200'
                                                        : 'border-gray-100 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center text-2xl`}>
                                                    {level.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-gray-900">
                                                            {level.name}
                                                        </h3>
                                                        {isCurrentLevel && (
                                                            <span className="text-xs bg-bikitchen-orange text-white px-2 py-0.5 rounded-full">
                                                                Tu nivel
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">
                                                        {level.minPoints === 0 ? 'Nivel inicial' : `${level.minPoints.toLocaleString('es-CR')} puntos acumulados`}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {level.benefits.map((benefit, i) => (
                                                            <span 
                                                                key={i}
                                                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                                            >
                                                                {benefit}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-gray-900">
                                                        {level.multiplier}x
                                                    </p>
                                                    <p className="text-xs text-gray-500">puntos</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* History */}
                <section className="py-8">
                    <div className="container">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Clock className="text-bikitchen-orange" size={24} />
                                Historial de Puntos
                            </h2>

                            {history.length > 0 ? (
                                <>
                                    <div className="space-y-3">
                                        {displayHistory.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                        item.type === 'earned' 
                                                            ? 'bg-green-100' 
                                                            : 'bg-purple-100'
                                                    }`}>
                                                        {item.type === 'earned' ? (
                                                            <TrendingUp size={20} className="text-green-600" />
                                                        ) : (
                                                            <Gift size={20} className="text-purple-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {item.description}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatDate(item.date)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`text-right ${
                                                    item.type === 'earned' ? 'text-green-600' : 'text-purple-600'
                                                }`}>
                                                    <p className="font-bold">
                                                        {item.type === 'earned' ? '+' : ''}{item.points.toLocaleString('es-CR')}
                                                    </p>
                                                    <p className="text-xs">puntos</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {history.length > 5 && (
                                        <button
                                            onClick={() => setShowAllHistory(!showAllHistory)}
                                            className="w-full mt-4 py-3 text-bikitchen-orange font-medium hover:bg-bikitchen-orange/5 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            {showAllHistory ? 'Ver menos' : `Ver todo (${history.length})`}
                                            <ChevronRight size={18} className={showAllHistory ? 'rotate-90' : ''} />
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl">
                                    <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 mb-4">
                                        Aún no tienes movimientos
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Haz tu primera compra para empezar a ganar puntos
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-12 bg-gradient-to-r from-bikitchen-orange to-orange-500">
                    <div className="container">
                        <div className="max-w-3xl mx-auto text-center text-white">
                            <Sparkles size={40} className="mx-auto mb-4 opacity-80" />
                            <h2 className="text-2xl font-bold mb-2">¡Empieza a ganar puntos hoy!</h2>
                            <p className="text-white/80 mb-6">
                                Cada compra te acerca a más beneficios y descuentos
                            </p>
                            <Link
                                to="/packs"
                                className="inline-flex items-center gap-2 bg-white text-bikitchen-orange px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                            >
                                Ver Packs
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </PageTransition>
    );
}
