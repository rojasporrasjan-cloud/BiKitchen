import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { ShoppingCart, Truck, Check, Info, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import MenuDetailsModal from '../components/menus/MenuDetailsModal';

// Mapeo de nombre comercial de pack -> clave de menú en Firestore
const PACK_TO_MENU_KEY = {
    'Full Pack': 'fullPack',
    'Pack Keto': 'keto',
    'Pack Bajo Calorías': 'bajoCalorias',
    'Pack Regular': 'regular',
    'Pack Sin Carbos': 'ceroCarbos',
    'Pack Vegetariano': 'vegetariano',
    'Pack Casaditos': 'casaditos'
};

const MEAL_IMAGES = {
    default: [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=200&h=150&fit=crop',
        'https://images.unsplash.com/photo-1551183053-bf91b1d3116c?w=200&h=150&fit=crop'
    ]
};

const formatPrice = (price) => `₡${price.toLocaleString('es-CR')}`;

const PackCard = ({ pack, shipping, category }) => {
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [showMenuModal, setShowMenuModal] = useState(false);
    const { addToCart } = useCart();

    const getPrice = () => {
        switch (selectedPlan) {
            case 'weekly': return pack.weekly;
            case 'biweekly': return pack.biweekly;
            case 'monthly': return pack.monthly;
            default: return pack.monthly;
        }
    };

    const getPlanLabel = () => {
        switch (selectedPlan) {
            case 'weekly': return 'Semanal';
            case 'biweekly': return 'Quincenal';
            case 'monthly': return 'Mensual';
            default: return 'Mensual';
        }
    };

    const getShipping = () => {
        switch (selectedPlan) {
            case 'weekly': return shipping.weekly;
            case 'biweekly': return shipping.biweekly;
            case 'monthly': return shipping.monthly;
            default: return shipping.monthly;
        }
    };

    const handleAddToCart = () => {
        addToCart({
            id: `${category}-${pack.name}`,
            name: pack.name,
            desc: pack.desc,
            icon: pack.icon,
            price: getPrice(),
            plan: selectedPlan,
            planLabel: getPlanLabel()
        });
    };
    const menuKey = PACK_TO_MENU_KEY[pack.name];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-orange-200 group ${pack.featured ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
            >
                {pack.featured && (
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center py-2 text-xs font-bold uppercase tracking-wider">
                        ⭐ Oferta Especial
                    </div>
                )}

                <div className="p-6">
                    <div className="text-center mb-4">
                        <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                            {pack.icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{pack.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{pack.desc}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {MEAL_IMAGES.default.map((img, idx) => (
                            <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-100">
                                <img
                                    src={img}
                                    alt={`Comida ${idx + 1}`}
                                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                />
                            </div>
                        ))}
                    </div>

                    {menuKey && (
                        <button
                            onClick={() => setShowMenuModal(true)}
                            className="w-full mb-4 text-sm text-orange-500 hover:text-orange-600 font-semibold flex items-center justify-center gap-2 py-2 hover:bg-orange-50 rounded-xl transition-colors"
                        >
                            <Eye size={16} />
                            Ver detalles del menú
                        </button>
                    )}

                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setSelectedPlan('weekly')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${selectedPlan === 'weekly'
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Semanal
                        </button>
                        <button
                            onClick={() => setSelectedPlan('biweekly')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${selectedPlan === 'biweekly'
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Quincenal
                        </button>
                        <button
                            onClick={() => setSelectedPlan('monthly')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${selectedPlan === 'monthly'
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Mensual
                        </button>
                    </div>

                    <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-orange-500">
                            {formatPrice(getPrice())}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {selectedPlan === 'weekly' ? 'por semana' : selectedPlan === 'biweekly' ? 'por quincena' : 'por mes'}
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                        <div className="flex items-start gap-2">
                            <Truck size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600 font-medium">
                                {getShipping()}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                    >
                        <ShoppingCart size={18} />
                        Agregar al Carrito
                    </button>
                </div>
            </motion.div>
            <MenuDetailsModal
                menuKey={menuKey}
                isOpen={showMenuModal}
                onClose={() => setShowMenuModal(false)}
                packInfo={{
                    name: pack.name,
                    desc: pack.desc,
                    icon: pack.icon,
                    price: formatPrice(getPrice()),
                    numericPrice: getPrice(),
                    plan: selectedPlan,
                    planLabel: getPlanLabel(),
                    image: MEAL_IMAGES.default[0]
                }}
            />
        </>
    );
};

const PackSection = ({ category, data }) => {
    return (
        <section className="mb-20">
            <div className="text-center mb-12">
                <div className="text-6xl mb-4">{data.icon}</div>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-3">{data.title}</h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">{data.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.packs.map((pack, index) => (
                    <PackCard
                        key={index}
                        pack={pack}
                        shipping={data.shipping}
                        category={category}
                    />
                ))}
            </div>
        </section>
    );
};

const PACKS_DATA = {
    '5_comidas': {
        title: '5 Comidas a la Semana',
        subtitle: 'Lunes a Viernes - Perfecto para empezar',
        icon: '🥗',
        shipping: {
            weekly: '🚚 Envío no incluido',
            biweekly: '🚚 Envío no incluido',
            monthly: '🚚 Envío con 50% descuento'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 22000, biweekly: 42000, monthly: 78000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 23000, biweekly: 44000, monthly: 80000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 24000, biweekly: 45500, monthly: 82000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 25000, biweekly: 47000, monthly: 85000 },
            { name: 'Full Pack', desc: 'Máxima variedad', icon: '🍽️', weekly: 27000, biweekly: 49000, monthly: 88000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 23500, biweekly: 44500, monthly: 81000 },
            { name: 'Pack Keto', desc: 'Alto en grasas saludables', icon: '🥑', weekly: 26000, biweekly: 48000, monthly: 86000 }
        ]
    },
    '10_comidas': {
        title: '10 Comidas a la Semana',
        subtitle: 'Lunes a Viernes - Almuerzo y Cena',
        icon: '🍗',
        shipping: {
            weekly: '🚚 Envío no incluido',
            biweekly: '🚚 Envío no incluido',
            monthly: '🚚 Envío con 50% descuento'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 40000, biweekly: 75000, monthly: 142000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 42000, biweekly: 78000, monthly: 148000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 43500, biweekly: 80000, monthly: 150000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 45000, biweekly: 82000, monthly: 154000 },
            { name: 'Full Pack', desc: 'Máxima variedad', icon: '🍽️', weekly: 47000, biweekly: 86000, monthly: 158000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 41500, biweekly: 77000, monthly: 145000 },
            { name: 'Pack Keto', desc: 'Alto en grasas saludables', icon: '🥑', weekly: 46000, biweekly: 84000, monthly: 156000 }
        ]
    },
    'desayuno_almuerzo_cena': {
        title: 'Desayuno, Almuerzo y Cena',
        subtitle: '15 Comidas - Plan Completo',
        icon: '🌅',
        shipping: {
            weekly: '🚚 Envío no incluido',
            biweekly: '🚚 Envío no incluido',
            monthly: '🚚 Envío GRATIS (aplican restricciones por zona)'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 65000, biweekly: 120000, monthly: 228000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 68000, biweekly: 126000, monthly: 240000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 70000, biweekly: 130000, monthly: 248000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 72000, biweekly: 134000, monthly: 256000 },
            { name: 'Pack Familiar Premium', desc: 'Para toda la familia', icon: '👨‍👩‍👧‍👦', weekly: 75000, biweekly: 138000, monthly: 262000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 67000, biweekly: 122000, monthly: 235000 },
            { name: 'Pack Keto', desc: 'Alto en grasas saludables', icon: '🥑', weekly: 74000, biweekly: 136000, monthly: 258000 }
        ]
    },
    'two_pack': {
        title: 'Two Pack Semanal',
        subtitle: 'Dos personas - 5 comidas cada una',
        icon: '👥',
        shipping: {
            weekly: '🚚 Envío no incluido',
            biweekly: '🚚 Envío no incluido',
            monthly: '🚚 Envío con 50% descuento'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: 'Proteína + vegetales', icon: '🥩', weekly: 40000, biweekly: 75000, monthly: 142000 },
            { name: 'Pack Bajo Calorías', desc: 'Balanceado y ligero', icon: '🥗', weekly: 42000, biweekly: 78000, monthly: 148000 },
            { name: 'Pack Regular', desc: 'Comida completa', icon: '🍱', weekly: 43500, biweekly: 80000, monthly: 150000 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional', icon: '🍚', weekly: 45000, biweekly: 82000, monthly: 154000 },
            { name: 'Full Pack', desc: 'Máxima variedad', icon: '🍽️', weekly: 47000, biweekly: 86000, monthly: 158000 },
            { name: 'Pack Vegetariano', desc: 'Plant-based', icon: '🥦', weekly: 41500, biweekly: 77000, monthly: 145000 },
            { name: 'Pack Keto', desc: 'Alto en grasas saludables', icon: '🥑', weekly: 46000, biweekly: 84000, monthly: 156000 }
        ]
    },
    'promociones': {
        title: 'Promociones Especiales',
        subtitle: 'Ofertas exclusivas y packs familiares',
        icon: '⭐',
        shipping: {
            weekly: '🚚 Envío total',
            biweekly: '🚚 Envío total',
            monthly: '🚚 Envío con 50% descuento (Cartago no incluido)'
        },
        packs: [
            { name: 'Pack 3 Proteínas', desc: '250g cada una', icon: '🍗', weekly: 13500, biweekly: 25850, monthly: 93000, featured: true },
            { name: 'Pack 5 Proteínas', desc: '500g cada una', icon: '🥩', weekly: 21000, biweekly: 39950, monthly: 143000, featured: true },
            { name: 'Pack Familiar Premium', desc: 'Para toda la familia', icon: '👨‍👩‍👧‍👦', weekly: 41500, biweekly: 77200, monthly: 149400, featured: true },
            { name: 'Pack Familiar Deluxe', desc: 'Máxima calidad', icon: '✨', weekly: 47500, biweekly: 88500, monthly: 171000, featured: true }
        ]
    }
};

export default function PacksPage() {
    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <Navbar />

                {/* Hero Section */}
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
                                Packs BiKitchen
                            </h1>
                            <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto font-light text-white/90">
                                Elige cómo se ve tu semana: 5, 10 o más comidas con entrega planificada.
                            </p>
                            <p className="text-sm md:text-base mb-8 max-w-2xl mx-auto text-white/70">
                                Regular, sin carbos, bajo en calorías, vegetariano, casaditos, keto o full pack.
                                <br />También armamos planes personalizados.
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

                <main className="container py-16 pb-32">
                    {Object.entries(PACKS_DATA).map(([key, data]) => (
                        <PackSection key={key} category={key} data={data} />
                    ))}

                    <div className="mt-16 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-800 border border-orange-200 dark:border-gray-700 rounded-2xl p-8 text-center">
                        <Info size={28} className="text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 text-sm max-w-2xl mx-auto">
                            *Los menús se actualizan cada sábado según la planificación del equipo BiKitchen.
                            Los ingredientes pueden variar levemente según disponibilidad.
                        </p>
                    </div>

                    <div className="mt-6 bg-amber-50 dark:bg-gray-800 border border-amber-200 dark:border-gray-700 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <Info size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-amber-900 dark:text-amber-400 mb-1">Información Importante</h3>
                                <p className="text-amber-700 dark:text-amber-300 text-sm">
                                    *Cartago no incluido en envío gratis. Contáctanos para más información sobre zonas de entrega.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
