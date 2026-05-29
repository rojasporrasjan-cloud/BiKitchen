import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { motion } from 'framer-motion';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import { formatPrice } from '../utils/formatters';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import {
    Check, X, Star, Zap, Crown, ArrowRight, ShoppingCart,
    Package, Users, Flame, Leaf, HelpCircle, ChevronDown
} from 'lucide-react';

// Mapeo de IDs a hashes de sección en PacksPage
const PACK_LINKS = {
    'pack-5': '/packs#pack-5_comidas',
    'pack-10': '/packs#pack-10_comidas',
    'pack-15': '/packs#pack-desayuno_almuerzo_cena',
    'two-pack': '/packs#pack-two_pack'
};

const PACKS_COMPARISON = [
    {
        id: 'pack-5',
        name: 'Pack 5 Comidas',
        subtitle: 'Semanal',
        icon: '🥗',
        color: 'green',
        popular: false,
        description: 'Ideal para empezar',
        prices: {
            weekly: 24500,
            biweekly: 45600,
            monthly: 78400
        },
        features: {
            comidas: 5,
            variedad: 'Básica',
            personalizacion: false,
            envioGratis: false,
            descuento: '0%',
            soporte: 'WhatsApp',
            menuRotativo: true,
            cambiosMenu: false
        }
    },
    {
        id: 'pack-10',
        name: 'Almuerzo y Cena',
        subtitle: 'Quincenal',
        icon: '🍱',
        color: 'orange',
        popular: true,
        description: 'El más popular',
        prices: {
            weekly: 49000,
            biweekly: 91000,
            monthly: 156800
        },
        features: {
            comidas: 10,
            variedad: 'Amplia',
            personalizacion: true,
            envioGratis: false,
            descuento: '0%',
            soporte: 'WhatsApp',
            menuRotativo: true,
            cambiosMenu: true
        }
    },

    {
        id: 'pack-15',
        name: 'Pack 15 Comidas',
        subtitle: 'Desayuno + Almuerzo + Cena',
        icon: '👨‍🍳',
        color: 'pink',
        popular: false,
        description: 'Cobertura completa',
        prices: {
            weekly: 61500,
            biweekly: 114500,
            monthly: 196800
        },
        features: {
            comidas: 15,
            variedad: 'Premium',
            personalizacion: true,
            envioGratis: true,
            descuento: '0%',
            soporte: 'Prioritario',
            menuRotativo: true,
            cambiosMenu: true
        }
    },
    {
        id: 'two-pack',
        name: 'Two Pack',
        subtitle: 'Para parejas',
        icon: '👫',
        color: 'blue',
        popular: false,
        description: '5 comidas × 2 personas',
        prices: {
            weekly: 49000,
            biweekly: 91000,
            monthly: 147000
        },
        features: {
            comidas: '10 (5×2)',
            variedad: 'Amplia',
            personalizacion: true,
            envioGratis: false,
            descuento: '0%',
            soporte: 'WhatsApp',
            menuRotativo: true,
            cambiosMenu: true
        }
    }
];

const FEATURES_INFO = [
    { key: 'comidas', label: 'Comidas incluidas', icon: Package },
    { key: 'variedad', label: 'Variedad de menú', icon: Flame },
    { key: 'personalizacion', label: 'Personalización', icon: Users, boolean: true },
    { key: 'envioGratis', label: 'Envío gratis', icon: Zap, boolean: true },
    { key: 'descuento', label: 'Descuento incluido', icon: Star },
    { key: 'soporte', label: 'Tipo de soporte', icon: HelpCircle },
    { key: 'menuRotativo', label: 'Menú rotativo semanal', icon: Leaf, boolean: true },
    { key: 'cambiosMenu', label: 'Cambios en el menú', icon: Check, boolean: true }
];



const getColorClasses = (color) => {
    const colors = {
        green: {
            bg: 'bg-green-500',
            bgLight: 'bg-green-50',
            text: 'text-green-600',
            border: 'border-green-500',
            gradient: 'from-green-500 to-emerald-600'
        },
        orange: {
            bg: 'bg-bikitchen-orange',
            bgLight: 'bg-orange-50',
            text: 'text-bikitchen-orange',
            border: 'border-bikitchen-orange',
            gradient: 'from-bikitchen-orange to-orange-600'
        },
        purple: {
            bg: 'bg-purple-500',
            bgLight: 'bg-purple-50',
            text: 'text-purple-600',
            border: 'border-purple-500',
            gradient: 'from-purple-500 to-indigo-600'
        },
        pink: {
            bg: 'bg-pink-500',
            bgLight: 'bg-pink-50',
            text: 'text-pink-600',
            border: 'border-pink-500',
            gradient: 'from-pink-500 to-rose-600'
        },
        blue: {
            bg: 'bg-blue-500',
            bgLight: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-500',
            gradient: 'from-blue-500 to-cyan-600'
        }
    };
    return colors[color] || colors.orange;
};

export default function ComparadorPage() {
    const { getWhatsAppUrl } = useWhatsApp();
    const [selectedPlan, setSelectedPlan] = useState('weekly');
    const [expandedMobile, setExpandedMobile] = useState(null);

    const plans = [
        { id: 'weekly', label: 'Semanal' },
        { id: 'biweekly', label: 'Quincenal' },
        { id: 'monthly', label: 'Mensual', discount: 10 }
    ];

    // Descuento del 10% para planes mensuales
    const MONTHLY_DISCOUNT = 10;
    const isMonthlyPlan = selectedPlan === 'monthly';

    const getPrice = (originalPrice) => {
        if (isMonthlyPlan) {
            return Math.round(originalPrice * (1 - MONTHLY_DISCOUNT / 100));
        }
        return originalPrice;
    };

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.comparador}
                structuredData={getBreadcrumbSchema([{ name: 'Comparador de Planes', url: 'https://bikitchencr.com/comparador' }])}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <section className="relative pt-32 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-bikitchen-orange/5 to-purple-500/5"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-bikitchen-orange/10 rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" aria-hidden="true"></div>

                    <div className="container relative z-10">
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 bg-bikitchen-orange/10 text-bikitchen-orange px-4 py-2 rounded-full text-sm font-semibold mb-6"
                            >
                                <Package size={16} />
                                Encuentra tu pack ideal
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                            >
                                Comparador de Packs
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-gray-600 mb-8"
                            >
                                Compara características y precios para elegir el pack perfecto para ti
                            </motion.p>

                            {/* Plan Selector */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="inline-flex bg-white rounded-xl p-1 shadow-lg border border-gray-100"
                            >
                                {plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative ${selectedPlan === plan.id
                                            ? 'bg-bikitchen-orange text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {plan.label}
                                        {plan.discount && (
                                            <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                                                -{plan.discount}%
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Desktop Comparison Table */}
                <section className="py-12 hidden lg:block">
                    <div className="container">
                        <div className="max-w-6xl mx-auto">
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                                <table className="w-full">
                                    {/* Header */}
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="p-6 text-left bg-gray-50 w-1/5">
                                                <span className="text-sm font-semibold text-gray-500">
                                                    Características
                                                </span>
                                            </th>
                                            {PACKS_COMPARISON.map((pack) => {
                                                const colors = getColorClasses(pack.color);
                                                return (
                                                    <th key={pack.id} className="p-6 text-center relative">
                                                        {pack.popular && (
                                                            <div className="mb-2">
                                                                <span className="bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1">
                                                                    <Crown size={12} />
                                                                    Más Popular
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="text-4xl mb-2">{pack.icon}</div>
                                                        <h3 className={`font-bold text-lg ${colors.text}`}>
                                                            {pack.name}
                                                        </h3>
                                                        {pack.subtitle && (
                                                            <p className="text-xs font-medium text-gray-400 mt-0.5">
                                                                {pack.subtitle}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {pack.description}
                                                        </p>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>

                                    {/* Price Row */}
                                    <tbody>
                                        <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                                            <td className="p-6">
                                                <span className="font-semibold text-gray-900">
                                                    Precio {plans.find(p => p.id === selectedPlan)?.label}
                                                </span>
                                            </td>
                                            {PACKS_COMPARISON.map((pack) => {
                                                const colors = getColorClasses(pack.color);
                                                const originalPrice = pack.prices[selectedPlan];
                                                const finalPrice = originalPrice ? getPrice(originalPrice) : null;
                                                return (
                                                    <td key={pack.id} className="p-6 text-center">
                                                        {originalPrice === null ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm text-gray-400">Solo disponible</span>
                                                                <span className={`text-lg font-bold ${colors.text}`}>
                                                                    en plan mensual
                                                                </span>
                                                            </div>
                                                        ) : isMonthlyPlan ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm text-gray-400 line-through">
                                                                    {formatPrice(originalPrice)}
                                                                </span>
                                                                <span className={`text-2xl font-bold text-green-600`}>
                                                                    {formatPrice(finalPrice)}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                                    🎉 10% OFF
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className={`text-2xl font-bold ${colors.text}`}>
                                                                {formatPrice(originalPrice)}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>

                                        {/* Feature Rows */}
                                        {FEATURES_INFO.map((feature, index) => (
                                            <tr
                                                key={feature.key}
                                                className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                                    }`}
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <feature.icon size={16} className="text-gray-400" />
                                                        <span className="text-sm text-gray-700">
                                                            {feature.label}
                                                        </span>
                                                    </div>
                                                </td>
                                                {PACKS_COMPARISON.map((pack) => {
                                                    let value = pack.features[feature.key];
                                                    const colors = getColorClasses(pack.color);

                                                    // Mostrar descuento dinámico basado en el plan seleccionado
                                                    if (feature.key === 'descuento') {
                                                        if (selectedPlan === 'monthly') {
                                                            // Two Pack tiene 25% de descuento, otros tienen 20%
                                                            value = pack.id === 'two-pack' ? '25%' : '20%';
                                                        } else {
                                                            value = '0%';
                                                        }
                                                    }

                                                    return (
                                                        <td key={pack.id} className="p-4 text-center">
                                                            {feature.boolean ? (
                                                                value ? (
                                                                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colors.bg} text-white`}>
                                                                        <Check size={14} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-400">
                                                                        <X size={14} />
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <span className={`text-sm font-medium ${feature.key === 'descuento' && selectedPlan === 'monthly' && value !== '0%' ? 'text-green-600 font-bold' : 'text-gray-900'}`}>
                                                                    {value}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}

                                        {/* CTA Row */}
                                        <tr>
                                            <td className="p-6 bg-gray-50"></td>
                                            {PACKS_COMPARISON.map((pack) => {
                                                const colors = getColorClasses(pack.color);
                                                return (
                                                    <td key={pack.id} className="p-6 text-center bg-gray-50">
                                                        <Link
                                                            to={PACK_LINKS[pack.id]}
                                                            className={`inline-flex items-center gap-2 bg-gradient-to-r ${colors.gradient} text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}
                                                        >
                                                            <ShoppingCart size={18} />
                                                            Elegir Pack
                                                        </Link>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mobile Comparison Cards */}
                <section className="py-8 lg:hidden">
                    <div className="container">
                        <div className="space-y-4">
                            {PACKS_COMPARISON.map((pack, index) => {
                                const colors = getColorClasses(pack.color);
                                const isExpanded = expandedMobile === pack.id;

                                return (
                                    <motion.div
                                        key={pack.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 ${pack.popular ? 'border-bikitchen-orange' : 'border-gray-100'
                                            }`}
                                    >
                                        {pack.popular && (
                                            <div className="bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold text-white text-center py-2 text-sm font-bold">
                                                <Crown size={14} className="inline mr-1" />
                                                Más Popular
                                            </div>
                                        )}

                                        <div className="p-5">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">{pack.icon}</span>
                                                    <div>
                                                        <h3 className={`font-bold text-lg ${colors.text}`}>
                                                            {pack.name}
                                                        </h3>
                                                        {pack.subtitle && (
                                                            <p className="text-xs font-medium text-gray-400">
                                                                {pack.subtitle}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-500">
                                                            {pack.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className={`${isMonthlyPlan ? 'bg-green-50' : colors.bgLight} rounded-xl p-4 mb-4`}>
                                                <p className="text-sm text-gray-500 mb-1">
                                                    Precio {plans.find(p => p.id === selectedPlan)?.label}
                                                </p>
                                                {pack.prices[selectedPlan] === null ? (
                                                    <div>
                                                        <span className="text-sm text-gray-400">Solo disponible </span>
                                                        <span className={`text-lg font-bold ${colors.text}`}>
                                                            en plan mensual
                                                        </span>
                                                    </div>
                                                ) : isMonthlyPlan ? (
                                                    <div>
                                                        <span className="text-sm text-gray-400 line-through mr-2">
                                                            {formatPrice(pack.prices[selectedPlan])}
                                                        </span>
                                                        <span className="text-3xl font-bold text-green-600">
                                                            {formatPrice(getPrice(pack.prices[selectedPlan]))}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                                🎉 10% OFF
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                                🚚 50% envío
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className={`text-3xl font-bold ${colors.text}`}>
                                                        {formatPrice(pack.prices[selectedPlan])}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Quick Features */}
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Package size={14} className="text-gray-400" />
                                                    <span className="text-gray-700">
                                                        {pack.features.comidas} comidas
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Star size={14} className="text-gray-400" />
                                                    <span className={`${selectedPlan === 'monthly' ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                                                        {selectedPlan === 'monthly'
                                                            ? (pack.id === 'two-pack' ? '25%' : '20%')
                                                            : '0%'
                                                        } desc.
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expand Button */}
                                            <button
                                                onClick={() => setExpandedMobile(isExpanded ? null : pack.id)}
                                                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 py-2 hover:text-bikitchen-orange transition-colors"
                                            >
                                                {isExpanded ? 'Ver menos' : 'Ver todas las características'}
                                                <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Expanded Features */}
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="border-t border-gray-100 pt-4 mt-4 space-y-3"
                                                >
                                                    {FEATURES_INFO.map((feature) => {
                                                        let value = pack.features[feature.key];

                                                        // Mostrar descuento dinámico basado en el plan seleccionado
                                                        if (feature.key === 'descuento') {
                                                            if (selectedPlan === 'monthly') {
                                                                value = pack.id === 'two-pack' ? '25%' : '20%';
                                                            } else {
                                                                value = '0%';
                                                            }
                                                        }

                                                        return (
                                                            <div key={feature.key} className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <feature.icon size={14} className="text-gray-400" />
                                                                    <span className="text-sm text-gray-600">
                                                                        {feature.label}
                                                                    </span>
                                                                </div>
                                                                {feature.boolean ? (
                                                                    value ? (
                                                                        <Check size={18} className="text-green-500" />
                                                                    ) : (
                                                                        <X size={18} className="text-gray-300" />
                                                                    )
                                                                ) : (
                                                                    <span className={`text-sm font-medium ${feature.key === 'descuento' && selectedPlan === 'monthly' && value !== '0%' ? 'text-green-600 font-bold' : 'text-gray-900'}`}>
                                                                        {value}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}

                                            {/* CTA */}
                                            <Link
                                                to={PACK_LINKS[pack.id]}
                                                className={`mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r ${colors.gradient} text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all`}
                                            >
                                                <ShoppingCart size={18} />
                                                Elegir este Pack
                                            </Link>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Help Section */}
                <section className="py-12 bg-gray-50">
                    <div className="container">
                        <div className="max-w-3xl mx-auto text-center">
                            <HelpCircle size={48} className="mx-auto text-bikitchen-orange mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                ¿No sabes cuál elegir?
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Nuestro equipo puede ayudarte a encontrar el pack perfecto según tus necesidades y estilo de vida.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href={getWhatsAppUrl('Información General ℹ️')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                >
                                    Consultar por WhatsApp
                                </a>
                                <Link
                                    to="/faq"
                                    className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100:bg-gray-600 transition-colors border border-gray-200"
                                >
                                    Ver Preguntas Frecuentes
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </PageTransition>
    );
}
