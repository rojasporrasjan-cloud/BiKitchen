import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { X, ShoppingCart, Check, Eye, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import IngredientScanner from '../components/IngredientScanner';

const MOCK_MEALS = [
    {
        id: 1,
        title: "Pollo Limón & Romero",
        category: "Pollo",
        goal: "Balance",
        image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        calories: 420,
        protein: "35g",
        carbs: "25g",
        fat: "12g",
        price: 7500,
        description: "Pechuga de pollo de granja marinada en cítricos y romero fresco, servida sobre una cama de quinoa tricolor y espárragos grillados.",
        ingredients: ["Pechuga de Pollo", "Limón Real", "Romero", "Quinoa", "Espárragos"]
    },
    {
        id: 2,
        title: "Filete Teriyaki Artesanal",
        category: "Res",
        goal: "Muscle",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        calories: 550,
        protein: "40g",
        carbs: "45g",
        fat: "18g",
        price: 8500,
        description: "Cortes premium de res en nuestra salsa teriyaki de la casa (sin azúcar refinada), acompañados de brócoli al vapor y arroz jazmín.",
        ingredients: ["Filete de Res", "Salsa Teriyaki Casera", "Arroz Jazmín", "Brócoli", "Ajonjolí"]
    },
    {
        id: 3,
        title: "Salmón del Atlántico",
        category: "Pescado",
        goal: "Low Carb",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        calories: 480,
        protein: "32g",
        carbs: "20g",
        fat: "22g",
        price: 9500,
        description: "Salmón fresco horneado lentamente para mantener su jugosidad, servido con vegetales de estación y un toque de eneldo.",
        ingredients: ["Salmón Fresco", "Zanahoria Baby", "Calabacín", "Eneldo", "Aceite de Oliva"]
    },
    {
        id: 4,
        title: "Lasaña de la Huerta",
        category: "Veggie",
        goal: "Balance",
        image: "https://images.unsplash.com/photo-1551183053-bf91b1d3116c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        calories: 380,
        protein: "18g",
        carbs: "42g",
        fat: "14g",
        price: 7000,
        description: "Láminas de pasta integral intercaladas con una rica mezcla de espinacas, champiñones portobello y nuestra salsa pomodoro rústica.",
        ingredients: ["Pasta Integral", "Espinaca Orgánica", "Portobello", "Tomates", "Ricotta"]
    },
    {
        id: 5,
        title: "Albóndigas de Pavo",
        category: "Pollo",
        goal: "Muscle",
        image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        calories: 410,
        protein: "38g",
        carbs: "28g",
        fat: "15g",
        price: 7800,
        description: "Albóndigas ligeras de pavo en salsa de chipotle suave, acompañadas de un puré de camote dulce y cremoso.",
        ingredients: ["Pavo Molido", "Chipotle", "Camote", "Huevo de Campo", "Cilantro"]
    },
    {
        id: 6,
        title: "Wrap de Atún Fresco",
        category: "Pescado",
        goal: "Low Carb",
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        calories: 320,
        protein: "28g",
        carbs: "12g",
        fat: "10g",
        price: 6500,
        description: "Ensalada de atún preparada al momento con vegetales crujientes, envuelta en hojas frescas de lechuga romana.",
        ingredients: ["Lomo de Atún", "Lechuga Romana", "Pepino", "Apio", "Yogurt Griego"]
    }
];

const GOALS = ["Todos", "Balance", "Muscle", "Low Carb"];

export default function CatalogPage() {
    const [activeGoal, setActiveGoal] = useState("Todos");
    const [selectedMeal, setSelectedMeal] = useState(null);
    const { addToCart } = useCart();

    const filteredMeals = activeGoal === "Todos"
        ? MOCK_MEALS
        : MOCK_MEALS.filter(meal => meal.goal === activeGoal);

    const handleAddToCart = (meal) => {
        addToCart({
            id: `meal-${meal.id}`,
            name: meal.title,
            desc: `${meal.calories} Kcal | ${meal.protein} Proteína`,
            icon: '🍽️',
            price: meal.price,
            plan: 'single',
            planLabel: 'A la Carta'
        });
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <Navbar />

                {/* Hero Section - BiKitchen Orange */}
                <header className="relative pt-32 pb-20 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:32px_32px] opacity-30"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl"></div>

                    <div className="container relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-5xl md:text-6xl font-bold mb-6">
                                Menú Individual
                            </h1>
                            <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto font-light text-white/90">
                                Elige plato por plato: desayunos y comidas individuales que puedes combinar con tus packs.
                            </p>
                            <p className="text-sm md:text-base mb-8 max-w-2xl mx-auto text-white/70">
                                Sin carbos, bajo en calorías, regular, vegetariano, keto y más.
                                <br />Si prefieres que armemos todo por ti, visita la página de <a href="/packs" className="underline font-semibold hover:text-white">packs</a>.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 text-sm">
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <Check size={16} />
                                    <span>100% Natural</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <Check size={16} />
                                    <span>Ingredientes Frescos</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <Check size={16} />
                                    <span>Preparado Diariamente</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container py-16 pb-32">

                    {/* Filters */}
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                        {GOALS.map(goal => (
                            <button
                                key={goal}
                                onClick={() => setActiveGoal(goal)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeGoal === goal
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {goal}
                            </button>
                        ))}
                    </div>

                    {/* Meals Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMeals.map((meal) => (
                            <motion.div
                                key={meal.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-orange-200 group cursor-pointer"
                                onClick={() => setSelectedMeal(meal)}
                            >
                                <IngredientScanner
                                    className="aspect-[4/3]"
                                    data={{
                                        cal: meal.calories,
                                        protein: parseInt(meal.protein),
                                        carbs: parseInt(meal.carbs)
                                    }}
                                >
                                    <img
                                        src={meal.image}
                                        alt={meal.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-xl text-xs font-bold z-20">
                                        {meal.category}
                                    </div>
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-xl text-xs font-bold text-gray-700 z-20">
                                        {meal.goal}
                                    </div>
                                </IngredientScanner>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{meal.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{meal.description}</p>

                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                                            <span>{meal.calories} Kcal</span>
                                            <span>•</span>
                                            <span>{meal.protein} Prot</span>
                                            <span>•</span>
                                            <span>{meal.carbs} Carbs</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-orange-500">
                                            ₡{meal.price.toLocaleString('es-CR')}
                                        </span>
                                        <button className="text-sm text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-2">
                                            <Eye size={16} />
                                            Ver detalles
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Info Banner */}
                    <div className="mt-16 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-800 border border-orange-200 dark:border-gray-700 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <Info size={22} className="text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Información Importante</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    Estas comidas son ejemplos de lo que incluimos en nuestros packs semanales y mensuales.
                                    Para ordenar, visita nuestra <a href="/packs" className="text-orange-500 underline font-semibold hover:text-orange-600">página de packs</a>.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Modal */}
                <AnimatePresence>
                    {selectedMeal && (
                        <div
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSelectedMeal(null)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            >
                                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 flex items-center justify-between z-10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">🍽️</span>
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedMeal.title}</h2>
                                            <p className="text-white/80 text-sm">{selectedMeal.category} • {selectedMeal.goal}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMeal(null)}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-6">
                                    <div className="mb-6">
                                        <img
                                            src={selectedMeal.image}
                                            alt={selectedMeal.title}
                                            className="w-full h-64 object-cover rounded-xl"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Descripción</h3>
                                        <p className="text-gray-600 leading-relaxed">{selectedMeal.description}</p>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 mb-6 bg-orange-50 p-4 rounded-xl">
                                        <div className="text-center">
                                            <span className="block font-bold text-orange-500 text-xl">{selectedMeal.calories}</span>
                                            <span className="text-xs text-gray-500">Kcal</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-orange-500 text-xl">{selectedMeal.protein}</span>
                                            <span className="text-xs text-gray-500">Proteína</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-orange-500 text-xl">{selectedMeal.carbs}</span>
                                            <span className="text-xs text-gray-500">Carbos</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-orange-500 text-xl">{selectedMeal.fat}</span>
                                            <span className="text-xs text-gray-500">Grasas</span>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-3">Ingredientes</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedMeal.ingredients.map((ing, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-gray-700 text-xs font-medium rounded-xl">
                                                    {ing}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-gray-600">Precio por plato</span>
                                            <span className="text-3xl font-bold text-orange-500">
                                                ₡{selectedMeal.price.toLocaleString('es-CR')}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleAddToCart(selectedMeal);
                                                setSelectedMeal(null);
                                            }}
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2"
                                        >
                                            <ShoppingCart size={20} />
                                            Agregar al Carrito
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <Footer />
            </div>
        </PageTransition>
    );
}
