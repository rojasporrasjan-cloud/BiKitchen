import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import { formatPrice } from '../utils/formatters';
import {
    Calculator, Clock, DollarSign, ShoppingCart, ChefHat,
    TrendingDown, Sparkles, ArrowRight, Check, Zap, Heart,
    Users, Minus, Plus
} from 'lucide-react';

// Datos de referencia para cálculos
const COOKING_DATA = {
    avgTimePerMeal: 45, // minutos promedio para cocinar una comida
    avgShoppingTime: 60, // minutos promedio de compras semanales
    avgCleaningTime: 15, // minutos de limpieza por comida
    avgGroceryCostPerMeal: 3500, // costo promedio de ingredientes por comida en colones
    avgElectricityCost: 200, // costo de gas/electricidad por comida
    minWagePerHour: 2100, // salario mínimo por hora aproximado
};

const BIKITCHEN_PRICES = {
    5: { price: 22500, perMeal: 4500 },
    10: { price: 42500, perMeal: 4250 },
    15: { price: 60000, perMeal: 4000 }
};

export default function CalculadoraAhorroPage() {
    const [mealsPerWeek, setMealsPerWeek] = useState(10);
    const [hourlyRate, setHourlyRate] = useState(5000); // Valor del tiempo por hora
    const [includeWeekends, setIncludeWeekends] = useState(true);

    const calculations = useMemo(() => {
        // Tiempo cocinando en casa
        const cookingTime = mealsPerWeek * COOKING_DATA.avgTimePerMeal;
        const cleaningTime = mealsPerWeek * COOKING_DATA.avgCleaningTime;
        const shoppingTime = COOKING_DATA.avgShoppingTime;
        const totalTimeHome = cookingTime + cleaningTime + shoppingTime;
        const totalTimeHomeHours = totalTimeHome / 60;

        // Costo cocinando en casa
        const groceryCost = mealsPerWeek * COOKING_DATA.avgGroceryCostPerMeal;
        const utilitiesCost = mealsPerWeek * COOKING_DATA.avgElectricityCost;
        const timeCostHome = totalTimeHomeHours * hourlyRate;
        const totalCostHome = groceryCost + utilitiesCost;
        const totalCostHomeWithTime = totalCostHome + timeCostHome;

        // Costo con BiKitchen
        let bikitchenPack = 5;
        if (mealsPerWeek >= 12) bikitchenPack = 15;
        else if (mealsPerWeek >= 7) bikitchenPack = 10;
        
        const bikitchenPrice = BIKITCHEN_PRICES[bikitchenPack].price;
        const bikitchenPerMeal = BIKITCHEN_PRICES[bikitchenPack].perMeal;
        const bikitchenTotal = Math.ceil(mealsPerWeek / bikitchenPack) * bikitchenPrice;

        // Tiempo con BiKitchen (solo calentar ~5 min)
        const bikitchenTime = mealsPerWeek * 5; // 5 minutos por comida
        const bikitchenTimeHours = bikitchenTime / 60;
        const timeCostBikitchen = bikitchenTimeHours * hourlyRate;

        // Ahorros
        const timeSaved = totalTimeHome - bikitchenTime;
        const timeSavedHours = timeSaved / 60;
        const moneySavedDirect = totalCostHome - bikitchenTotal;
        const moneySavedWithTime = totalCostHomeWithTime - (bikitchenTotal + timeCostBikitchen);

        // Proyecciones mensuales y anuales
        const monthlyTimeSaved = timeSavedHours * 4;
        const yearlyTimeSaved = timeSavedHours * 52;
        const monthlyMoneySaved = moneySavedWithTime * 4;
        const yearlyMoneySaved = moneySavedWithTime * 52;

        return {
            home: {
                cookingTime,
                cleaningTime,
                shoppingTime,
                totalTime: totalTimeHome,
                totalTimeHours: totalTimeHomeHours,
                groceryCost,
                utilitiesCost,
                timeCost: timeCostHome,
                totalCost: totalCostHome,
                totalCostWithTime: totalCostHomeWithTime
            },
            bikitchen: {
                pack: bikitchenPack,
                price: bikitchenPrice,
                perMeal: bikitchenPerMeal,
                total: bikitchenTotal,
                time: bikitchenTime,
                timeHours: bikitchenTimeHours,
                timeCost: timeCostBikitchen
            },
            savings: {
                time: timeSaved,
                timeHours: timeSavedHours,
                moneyDirect: moneySavedDirect,
                moneyWithTime: moneySavedWithTime,
                monthlyTime: monthlyTimeSaved,
                yearlyTime: yearlyTimeSaved,
                monthlyMoney: monthlyMoneySaved,
                yearlyMoney: yearlyMoneySaved
            }
        };
    }, [mealsPerWeek, hourlyRate]);

    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours === 0) return `${mins} min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}min`;
    };

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.calculadora}
                structuredData={getBreadcrumbSchema([{ name: 'Calculadora de Ahorro', url: 'https://bikitchencr.com/calculadora' }])}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <section className="relative pt-32 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-bikitchen-orange/5"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-bikitchen-orange/10 rounded-full blur-3xl" aria-hidden="true"></div>
                    
                    <div className="container relative z-10">
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            >
                                <Calculator size={16} />
                                Calculadora Interactiva
                            </motion.div>
                            
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                            >
                                ¿Cuánto ahorras con BiKitchen?
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-gray-600"
                            >
                                Descubre cuánto tiempo y dinero puedes ahorrar dejando de cocinar
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Calculator Section */}
                <section className="py-12">
                    <div className="container">
                        <div className="max-w-5xl mx-auto">
                            {/* Input Controls */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 border border-gray-100"
                            >
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Sparkles className="text-bikitchen-orange" size={24} />
                                    Personaliza tu cálculo
                                </h2>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Meals per week */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            ¿Cuántas comidas preparas por semana?
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setMealsPerWeek(Math.max(3, mealsPerWeek - 1))}
                                                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200:bg-gray-600 transition-colors"
                                            >
                                                <Minus size={18} />
                                            </button>
                                            <div className="flex-1 text-center">
                                                <span className="text-4xl font-bold text-bikitchen-orange">{mealsPerWeek}</span>
                                                <p className="text-sm text-gray-500">comidas/semana</p>
                                            </div>
                                            <button
                                                onClick={() => setMealsPerWeek(Math.min(21, mealsPerWeek + 1))}
                                                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200:bg-gray-600 transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min="3"
                                            max="21"
                                            value={mealsPerWeek}
                                            onChange={(e) => setMealsPerWeek(Number(e.target.value))}
                                            className="w-full mt-4 accent-bikitchen-orange"
                                        />
                                    </div>

                                    {/* Hourly rate */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            ¿Cuánto vale tu hora de tiempo?
                                        </label>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-bold text-green-600">
                                                    {formatPrice(hourlyRate)}
                                                </span>
                                                <span className="text-sm text-gray-500">/hora</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="2000"
                                                max="20000"
                                                step="500"
                                                value={hourlyRate}
                                                onChange={(e) => setHourlyRate(Number(e.target.value))}
                                                className="w-full accent-green-500"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>₡2,000</span>
                                                <span>₡20,000</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Comparison Cards */}
                            <div className="grid md:grid-cols-2 gap-6 mb-8">
                                {/* Cooking at Home */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
                                >
                                    <div className="bg-gray-100 px-6 py-4 flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                                            <ChefHat size={24} className="text-gray-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Cocinar en Casa</h3>
                                            <p className="text-sm text-gray-500">Método tradicional</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Clock size={14} className="text-gray-400" />
                                                    Tiempo cocinando
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {formatTime(calculations.home.cookingTime)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Sparkles size={14} className="text-gray-400" />
                                                    Limpieza
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {formatTime(calculations.home.cleaningTime)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <ShoppingCart size={14} className="text-gray-400" />
                                                    Compras
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {formatTime(calculations.home.shoppingTime)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Ingredientes</span>
                                                <span className="font-medium">{formatPrice(calculations.home.groceryCost)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Gas/Electricidad</span>
                                                <span className="font-medium">{formatPrice(calculations.home.utilitiesCost)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span className="text-sm">Valor de tu tiempo</span>
                                                <span className="font-medium">{formatPrice(calculations.home.timeCost)}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-semibold text-gray-700">Tiempo total</span>
                                                <span className="font-bold text-gray-900 text-lg">
                                                    {formatTime(calculations.home.totalTime)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-700">Costo total</span>
                                                <span className="font-bold text-gray-900 text-lg">
                                                    {formatPrice(calculations.home.totalCostWithTime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* BiKitchen */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-bikitchen-orange"
                                >
                                    <div className="bg-gradient-to-r from-bikitchen-orange to-orange-500 px-6 py-4 flex items-center gap-3 text-white">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Con BiKitchen</h3>
                                            <p className="text-sm text-white/80">Pack {calculations.bikitchen.pack} comidas</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Clock size={14} className="text-bikitchen-orange" />
                                                    Tiempo (solo calentar)
                                                </span>
                                                <span className="font-medium text-bikitchen-orange">
                                                    {formatTime(calculations.bikitchen.time)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Check size={14} className="text-green-500" />
                                                    Sin cocinar
                                                </span>
                                                <span className="font-medium text-green-500">✓</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Check size={14} className="text-green-500" />
                                                    Sin limpiar
                                                </span>
                                                <span className="font-medium text-green-500">✓</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Check size={14} className="text-green-500" />
                                                    Sin compras
                                                </span>
                                                <span className="font-medium text-green-500">✓</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Pack BiKitchen</span>
                                                <span className="font-medium">{formatPrice(calculations.bikitchen.total)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-400">
                                                <span className="text-sm">Valor de tu tiempo</span>
                                                <span className="font-medium">{formatPrice(calculations.bikitchen.timeCost)}</span>
                                            </div>
                                        </div>

                                        <div className="bg-bikitchen-orange/10 rounded-xl p-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-semibold text-gray-700">Tiempo total</span>
                                                <span className="font-bold text-bikitchen-orange text-lg">
                                                    {formatTime(calculations.bikitchen.time)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-700">Costo total</span>
                                                <span className="font-bold text-bikitchen-orange text-lg">
                                                    {formatPrice(calculations.bikitchen.total + calculations.bikitchen.timeCost)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Savings Summary */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white"
                            >
                                <h2 className="text-2xl font-bold mb-6 text-center">
                                    🎉 Tu Ahorro Semanal
                                </h2>

                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                                        <Clock size={32} className="mx-auto mb-2 opacity-80" />
                                        <p className="text-4xl font-bold mb-1">
                                            {calculations.savings.timeHours.toFixed(1)}h
                                        </p>
                                        <p className="text-white/80">de tiempo ahorrado</p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                                        <DollarSign size={32} className="mx-auto mb-2 opacity-80" />
                                        <p className="text-4xl font-bold mb-1">
                                            {formatPrice(Math.max(0, calculations.savings.moneyWithTime))}
                                        </p>
                                        <p className="text-white/80">de ahorro estimado</p>
                                    </div>
                                </div>

                                {/* Projections */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{calculations.savings.monthlyTime.toFixed(0)}h</p>
                                        <p className="text-sm text-white/70">al mes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{formatPrice(Math.max(0, calculations.savings.monthlyMoney))}</p>
                                        <p className="text-sm text-white/70">al mes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{calculations.savings.yearlyTime.toFixed(0)}h</p>
                                        <p className="text-sm text-white/70">al año</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{formatPrice(Math.max(0, calculations.savings.yearlyMoney))}</p>
                                        <p className="text-sm text-white/70">al año</p>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <Link
                                        to="/packs"
                                        className="inline-flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors text-lg"
                                    >
                                        <ShoppingCart size={24} />
                                        Empezar a Ahorrar
                                        <ArrowRight size={20} />
                                    </Link>
                                </div>
                            </motion.div>

                            {/* Benefits */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="mt-12 grid md:grid-cols-3 gap-6"
                            >
                                <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Clock size={28} className="text-blue-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">Más Tiempo Libre</h3>
                                    <p className="text-sm text-gray-600">
                                        Dedica ese tiempo a tu familia, hobbies o descanso
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                                    <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Heart size={28} className="text-green-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">Menos Estrés</h3>
                                    <p className="text-sm text-gray-600">
                                        Olvídate de planificar, comprar y cocinar cada día
                                    </p>
                                </div>
                                <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
                                    <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Users size={28} className="text-purple-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">Comida Saludable</h3>
                                    <p className="text-sm text-gray-600">
                                        Menús balanceados preparados por profesionales
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </PageTransition>
    );
}
