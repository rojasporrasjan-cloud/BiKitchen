import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { X, ShoppingCart, Check, Eye, Info, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useMenusRefresh } from '../hooks/useMenusRefresh';
import { usePromoBanner } from '../hooks/usePromoBanner';
import { Link } from 'react-router-dom';
import { trackViewContent, trackViewCategory, trackViewMenu } from '../services/facebookPixel';

// Categorías de menú disponibles
const MENU_CATEGORIES = {
    regular: { name: 'Regular', icon: '🍱', desc: 'Comida completa y balanceada' },
    bajoCalorias: { name: 'Bajo Calorías', icon: '🥗', desc: 'Ligero y nutritivo' },
    sinCarbos: { name: 'Sin Carbos', icon: '🥩', desc: 'Proteína + vegetales' },
    keto: { name: 'Keto', icon: '🥑', desc: 'Alto en grasas saludables' },
    vegetariano: { name: 'Vegetariano', icon: '🥦', desc: 'Plant-based' },
    casaditos: { name: 'Casaditos', icon: '🍚', desc: 'Estilo tradicional tico' },
    fullPack: { name: 'Full Pack', icon: '🍽️', desc: 'Máxima variedad' }
};

import { useQuery } from '../hooks/useQuery';

export default function CatalogPage() {
    const query = useQuery();
    
    /** 
     * Default category is 'regular'. 
     * We attempt to sanitize the 'cat' parameter from the URL.
     */
    const urlCategory = query.get('cat') || query.get('category');
    const initialCategory = MENU_CATEGORIES[urlCategory] ? urlCategory : 'regular';

    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const showPromoBanner = usePromoBanner();

    // Usar el nuevo hook que recarga automáticamente cuando la página vuelve a estar visible
    const { menus, loading } = useMenusRefresh();

    const currentMenu = menus?.[activeCategory] || [];
    const categoryInfo = MENU_CATEGORIES[activeCategory];

    // Track ViewContent y Category cuando se carga la página de menú
    useEffect(() => {
        trackViewMenu(); // Evento general de menú
        if (urlCategory && MENU_CATEGORIES[urlCategory]) {
            trackViewCategory(MENU_CATEGORIES[urlCategory].name); // Evento específico de la categoría del anuncio
        }
        
        trackViewContent({
            id: 'menu-page',
            name: 'Menú Semanal',
            category: urlCategory ? MENU_CATEGORIES[urlCategory].name : 'Menu',
            price: 0
        });
    }, [urlCategory]);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <header
                    className="relative pt-28 pb-20 md:pt-36 md:pb-24 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white overflow-hidden"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 112px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    <div className="container relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                            <motion.span
                                className="inline-block mb-6 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-base font-bold border border-white/30 shadow-xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                🍽️ Menú Semanal BiKitchen
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 drop-shadow-lg leading-tight">
                                Menú de la Semana
                            </h1>
                            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-medium text-white/95 leading-relaxed">
                                Descubre los platos que preparamos esta semana para cada tipo de pack
                            </p>
                            <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto text-white/80 font-medium">
                                Cada semana renovamos nuestro menú con opciones frescas y variadas.
                                <br />¿Quieres ordenar? Visita nuestra <Link to="/packs" className="underline font-bold hover:text-white transition-colors">página de packs</Link>.
                            </p>
                            <motion.div
                                className="flex flex-wrap justify-center gap-4 text-base mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/30 shadow-lg font-semibold">
                                    <Check size={18} className="flex-shrink-0" />
                                    <span>Menú Rotativo</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/30 shadow-lg font-semibold">
                                    <Check size={18} className="flex-shrink-0" />
                                    <span>Ingredientes Frescos</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/30 shadow-lg font-semibold">
                                    <Check size={18} className="flex-shrink-0" />
                                    <span>Preparado con Amor</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container py-16 pb-32">

                    {/* Category Filters */}
                    <div className="flex flex-wrap justify-center gap-3 mb-16">
                        {Object.entries(MENU_CATEGORIES).map(([key, cat]) => (
                            <motion.button
                                key={key}
                                onClick={() => setActiveCategory(key)}
                                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border-2 ${activeCategory === key
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30 border-orange-500 scale-105'
                                    : 'bg-white text-gray-700 hover:bg-orange-50 border-gray-200 hover:border-orange-300'
                                    }`}
                                whileHover={{ scale: activeCategory === key ? 1.05 : 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <span className="text-lg">{cat.icon}</span>
                                {cat.name}
                            </motion.button>
                        ))}
                    </div>

                    {/* Category Info */}
                    {categoryInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-14"
                        >
                            <div className="text-7xl mb-6">{categoryInfo.icon}</div>
                            <h2 className="text-4xl font-black text-gray-900 mb-3">
                                Pack {categoryInfo.name}
                            </h2>
                            <p className="text-xl text-gray-600 font-medium">{categoryInfo.desc}</p>
                        </motion.div>
                    )}

                    {/* Menu Table */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-bikitchen-orange border-t-transparent"></div>
                        </div>
                    ) : currentMenu.length > 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-100"
                        >
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-5">
                                <h3 className="font-black text-xl flex items-center gap-3">
                                    <Utensils size={24} />
                                    Platos de la Semana - {categoryInfo?.name}
                                </h3>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {currentMenu.map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.4 }}
                                        className="p-7 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all"
                                    >
                                        <div className="flex items-start gap-5">
                                            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-lg">
                                                #{item.numero}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-black text-gray-900 text-xl mb-3">
                                                    {item.proteina}
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm rounded-xl font-bold border border-green-200">
                                                        🥬 {item.vegetal}
                                                    </span>
                                                    {item.carbo && item.carbo !== '—' && (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 text-sm rounded-xl font-bold border border-amber-200">
                                                            🍚 {item.carbo}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            <Utensils size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No hay menú disponible para esta categoría.</p>
                        </div>
                    )}

                    {/* CTA Banner */}
                    <motion.div
                        className="mt-20 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-3xl p-10 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h3 className="font-black text-3xl text-gray-900 mb-4">
                            ¿Te gustó el menú?
                        </h3>
                        <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto font-medium">
                            Ordena tu pack semanal y recibe estos deliciosos platos directamente en tu puerta
                        </p>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link
                                to="/packs"
                                className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-5 px-10 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-orange-500/50 text-lg"
                            >
                                <ShoppingCart size={24} />
                                Ver Packs Disponibles
                            </Link>
                        </motion.div>
                    </motion.div>
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
