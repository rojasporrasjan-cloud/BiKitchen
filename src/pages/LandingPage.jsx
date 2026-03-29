import { useMenus } from '../context/MenusContext';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import IngredientScanner from '../components/IngredientScanner';
import VelocityText from '../components/VelocityText';
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';
import { ArrowRight, Star, Leaf, Heart, Calendar, Truck, Utensils, Target, Eye, MessageCircle, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';

import { useAudio } from '../context/AudioContext';
import PageTransition from '../components/PageTransition';
import MagneticButton from '../components/MagneticButton';
import AISommelier from '../components/AISommelier';
import { useAuth } from '../context/AuthContext';
import TestimonialsSection from '../components/TestimonialsSection';
import { getPackPrices } from '../utils/firestoreMenus';
import { getHomePromotions } from '../utils/firestorePromotions';
import useIsMobile from '../hooks/useIsMobile';
import { useChristmas } from '../context/ChristmasContext';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { usePromoBanner } from '../hooks/usePromoBanner';

// Animation variants - más ligeras en móviles
const createFadeUpVariants = (isMobile) => ({
    hidden: { opacity: 0, y: isMobile ? 20 : 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: isMobile ? 0.4 : 0.8, ease: "easeOut" }
    }
});

const createStaggerContainer = (isMobile) => ({
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: isMobile ? 0.08 : 0.15 }
    }
});

// WhatsApp link se genera dinámicamente usando el hook useWhatsApp

export default function LandingPage() {
    const { isAdmin } = useAuth() || {};
    const { playHover, playClick } = useAudio();
    const { getWhatsAppUrl } = useWhatsApp();
    const WHATSAPP_LINK = getWhatsAppUrl('Quiero pedir 🛒');
    const isMobile = useIsMobile();
    const { isChristmasMode } = useChristmas();
    const showPromoBanner = usePromoBanner();
    const { menus } = useMenus();

    // Estado de visibilidad del navbar (para esconder el banner de promo junto con el navbar)
    const [navbarVisible, setNavbarVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = (e) => {
            setNavbarVisible(e.detail.visible);
        };
        window.addEventListener('navbarVisibilityChange', handleVisibilityChange);
        return () => window.removeEventListener('navbarVisibilityChange', handleVisibilityChange);
    }, []);

    // Variantes de animación optimizadas según dispositivo
    const fadeUpVariants = useMemo(() => createFadeUpVariants(isMobile), [isMobile]);
    const staggerContainer = useMemo(() => createStaggerContainer(isMobile), [isMobile]);

    const [packPrices, setPackPrices] = useState({
        fiveComidas: 22000,
        tenComidas: 40000,
        fifteenComidas: 65000
    });
    const [weeklyMenu, setWeeklyMenu] = useState([]);
    const [homePromo, setHomePromo] = useState(null);

    // Cargar precios y promociones; el menú se toma del MenusContext
    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar precios
                const prices = await getPackPrices();
                if (prices) {
                    const fiveMin = prices['5_comidas']?.packs ?
                        Math.min(...Object.values(prices['5_comidas'].packs).map(p => p.weekly || 99999)) : 22000;
                    const tenMin = prices['10_comidas']?.packs ?
                        Math.min(...Object.values(prices['10_comidas'].packs).map(p => p.weekly || 99999)) : 40000;
                    const fifteenMin = prices['15_comidas']?.packs ?
                        Math.min(...Object.values(prices['15_comidas'].packs).map(p => p.weekly || 99999)) : 65000;

                    setPackPrices({
                        fiveComidas: fiveMin !== 99999 ? fiveMin : 22000,
                        tenComidas: tenMin !== 99999 ? tenMin : 40000,
                        fifteenComidas: fifteenMin !== 99999 ? fifteenMin : 65000
                    });
                }

                // Cargar promoción para Home
                const homePromos = await getHomePromotions();
                if (homePromos.length > 0) {
                    setHomePromo(homePromos[0]);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        };
        loadData();
    }, []);

    // Derivar weeklyMenu desde MenusContext
    useEffect(() => {
        if (menus && menus.regular) {
            const menuItems = menus.regular.slice(0, 4).map((item) => ({
                title: item.proteina,
                desc: `${item.vegetal}${item.carbo && item.carbo !== '—' ? ` • ${item.carbo}` : ''}`,
                numero: item.numero
            }));
            setWeeklyMenu(menuItems);
        }
    }, [menus]);

    const formatPrice = (price) => `₡${price.toLocaleString('es-CR')}`;

    // Imágenes genéricas para el menú
    const menuImages = [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
    ];

    // Estado para el banner de promociones
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
    const promos = homePromo ? [
        { text: homePromo.titulo, desc: homePromo.descripcionCorta || "¡Aprovecha ahora!", link: "/promociones" },
        { text: "🎁 10% OFF al Registrarte", desc: "Regístrate hoy y obtén un 10% de descuento", link: "/login" }
    ] : [
        { text: "🎉 Promociones", desc: "Ofertas activas y descuentos", link: "/promociones" },
        { text: "🎉 Promoción Mensual", desc: "Desayunos GRATIS con tu pack mensual", link: "/promociones" },
        { text: "🎁 10% OFF al Registrarte", desc: "Regístrate hoy y obtén un 10% de descuento", link: "/login" }
    ];

    // Rotar promociones cada 4 segundos
    useEffect(() => {
        if (promos.length > 1) {
            const interval = setInterval(() => {
                setCurrentPromoIndex(prev => (prev + 1) % promos.length);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [promos.length]);

    return (
        <PageTransition>
            <SEOHead {...SEO_CONFIG.home} />
            <div className="min-h-screen flex flex-col overflow-x-hidden font-sans text-gray-800 bg-bikitchen-beige">
                <Navbar />

                {/* Banner de Promociones Premium - Debajo del navbar */}
                <Link
                    to={promos[currentPromoIndex]?.link || "/promociones"}
                    className={`fixed left-0 right-0 z-[35] group shadow-lg transition-all duration-300`}
                    style={{
                        transform: navbarVisible ? 'translateY(0)' : 'translateY(-200px)',
                        opacity: navbarVisible ? 1 : 0,
                        top: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + ${isMobile ? '74px' : '80px'})`
                            : (isMobile ? '74px' : '80px')
                    }}
                >
                    <div className="relative bg-gradient-to-r from-bikitchen-orange via-orange-500 to-bikitchen-gold overflow-hidden">
                        {/* Partículas decorativas - solo en desktop */}
                        {!isMobile && (
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute top-1 left-[10%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                <div className="absolute top-2 left-[50%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                <div className="absolute top-1 left-[90%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                            </div>
                        )}

                        {/* Contenido */}
                        <div className="relative py-1.5 md:py-2">
                            <div className="container flex items-center justify-center gap-2 md:gap-4">
                                {/* Icono */}
                                <div className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-sm md:text-base">🎁</span>
                                </div>

                                {/* Texto */}
                                <div className="flex-1 flex items-center justify-center gap-2 md:gap-4 overflow-hidden">
                                    <div className="flex items-center gap-2 md:gap-4 text-white">
                                        <span className="font-bold text-xs md:text-sm tracking-wide">
                                            {promos[currentPromoIndex].text}
                                        </span>
                                        <span className="hidden sm:block text-white/90 text-xs md:text-sm">
                                            {promos[currentPromoIndex].desc}
                                        </span>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="flex-shrink-0 flex items-center gap-1 bg-white/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                                    <span className="text-white text-xs font-semibold">Ver</span>
                                    <ArrowRight size={12} className="text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>

                <main className="flex-1 mt-24 md:mt-28">
                    {/* Hero Section */}
                    <header className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600">
                        {/* Decorative orbs */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl"></div>
                        {/* Pattern overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                        <div className="container grid lg:grid-cols-12 gap-12 items-center relative z-10">
                            <motion.div
                                className="lg:col-span-7 relative"
                                initial="hidden"
                                animate="visible"
                                variants={staggerContainer}
                            >
                                <motion.span
                                    variants={fadeUpVariants}
                                    className="inline-block font-bold text-base text-white mb-6 tracking-wide bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30 shadow-xl"
                                >
                                    🍳 Comida casera • Saludable • Lista para calentar
                                </motion.span>

                                <motion.h1
                                    variants={fadeUpVariants}
                                    className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-8 leading-[1.05] tracking-tight drop-shadow-2xl"
                                >
                                    Comida saludable lista para comer, toda la semana, sin complicarte.
                                </motion.h1>

                                <motion.p
                                    variants={fadeUpVariants}
                                    className="text-xl lg:text-2xl text-white/95 mb-10 max-w-xl leading-relaxed font-medium"
                                >
                                    Hecha por manos locales, balanceada y llena de sabor casero.
                                </motion.p>

                                <motion.div
                                    variants={fadeUpVariants}
                                    className="flex flex-wrap gap-4 items-center"
                                >
                                    <MagneticButton as="div" className="inline-block">
                                        <Link
                                            to="/packs"
                                            className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 text-orange-600 font-black px-10 py-5 rounded-2xl text-xl shadow-2xl hover:shadow-white/50 transition-all duration-300 hover:scale-105"
                                        >
                                            Ver Planes Semanales
                                            <ArrowRight size={24} />
                                        </Link>
                                    </MagneticButton>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Link
                                            to="/promociones"
                                            className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-black px-10 py-5 rounded-2xl text-xl shadow-2xl border-2 border-white/30 transition-all duration-300"
                                        >
                                            <Sparkles size={24} />
                                            Ver Promociones del Mes
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            </motion.div>

                            <motion.div
                                className="lg:col-span-5 relative hidden lg:block"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                <div className="relative z-10 group">
                                    <div className="rounded-3xl shadow-2xl overflow-hidden border-4 border-white/30">
                                        <img
                                            src="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85"
                                            alt="Platos caseros BiKitchen"
                                            className="w-full object-cover h-[450px] transition-transform duration-700 ease-out group-hover:scale-105"
                                        />
                                    </div>
                                    <div className="absolute -bottom-6 -left-6 bg-white p-5 shadow-xl max-w-xs rounded-2xl">
                                        <p className="font-bold text-lg text-bikitchen-orange mb-2">"El sabor de hogar"</p>
                                        <div className="flex text-amber-400">
                                            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <div className="absolute -top-4 -right-4 bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                        +100 opciones
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </header>

                    {/* Sección "Elige tu forma de comer BiKitchen" */}
                    <section className="py-24 bg-gradient-to-b from-orange-50 to-amber-50">
                        <div className="container">
                            <motion.div
                                className="text-center mb-16"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                                    Elige tu forma de comer BiKitchen
                                </h2>
                                <p className="text-gray-600 text-xl max-w-2xl mx-auto font-medium">
                                    Tres opciones pensadas para diferentes necesidades y momentos
                                </p>
                            </motion.div>

                            <motion.div
                                className="grid md:grid-cols-3 gap-8"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {[
                                    {
                                        icon: "🥗",
                                        title: "Planes Semanales",
                                        desc: "5, 10 o 15 comidas para tu semana.",
                                        link: "/packs",
                                        color: "from-bikitchen-orange to-orange-400"
                                    },
                                    {
                                        icon: "🎁",
                                        title: "Promociones del Mes",
                                        desc: "Combos especiales y packs familiares.",
                                        link: "/promociones",
                                        color: "from-orange-400 to-amber-400"
                                    },

                                ].map((item, idx) => (
                                    <motion.div key={idx} variants={fadeUpVariants}>
                                        <Link
                                            to={item.link}
                                            className="block bg-white rounded-3xl p-10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border-2 border-orange-100 group hover:border-orange-300"
                                        >
                                            <div className={`w-24 h-24 bg-gradient-to-br ${item.color} rounded-3xl flex items-center justify-center text-5xl mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                                                {item.icon}
                                            </div>
                                            <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-gray-600 mb-6 text-base font-medium">
                                                {item.desc}
                                            </p>
                                            <span className="inline-flex items-center gap-2 text-orange-600 font-bold group-hover:gap-4 transition-all">
                                                Explorar <ArrowRight size={20} />
                                            </span>
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </section>

                    {/* Sección "Ventajas BiKitchen" */}
                    <section className="py-24 bg-gradient-to-br from-bikitchen-beige to-orange-50">
                        <div className="container">
                            <motion.div
                                className="text-center mb-16"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block text-orange-600 font-black tracking-widest uppercase text-sm mb-6 bg-orange-100 px-6 py-3 rounded-full border-2 border-orange-200">
                                    ¿Por qué elegirnos?
                                </span>
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900">
                                    Ventajas BiKitchen
                                </h2>
                            </motion.div>

                            <motion.div
                                className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {[
                                    { icon: "🥗", text: "Porciones pensadas por nutricionista" },
                                    { icon: "🚚", text: "Entrega 3 veces por semana en tu zona" },
                                    { icon: "🍲", text: "Comida casera, lista para calentar" },
                                    { icon: "⏰", text: "Ahorra tiempo sin sacrificar sabor" }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex items-start gap-5 border-2 border-orange-100 hover:border-orange-300 hover:-translate-y-2"
                                    >
                                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                                            {item.icon}
                                        </div>
                                        <p className="text-gray-700 font-bold text-lg leading-relaxed pt-3">{item.text}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </section>

                    {/* About Us Section - NEW */}
                    <section className="py-24 bg-bikitchen-beige relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-72 h-72 bg-bikitchen-orange/10 rounded-full blur-3xl"></div>
                        <div className="container">
                            <motion.div
                                className="grid md:grid-cols-2 gap-16 items-center"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={staggerContainer}
                            >
                                <motion.div
                                    className="relative group order-2 md:order-1"
                                    variants={fadeUpVariants}
                                >
                                    <img
                                        src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                        alt="Equipo BiKitchen cocinando"
                                        className="w-full h-[400px] lg:h-[500px] object-cover rounded-3xl shadow-xl transition-all duration-700 group-hover:shadow-2xl"
                                    />
                                    <div className="absolute inset-0 border-2 border-bikitchen-orange/30 rounded-3xl transform translate-x-4 translate-y-4 -z-10 transition-transform duration-500 group-hover:translate-x-6 group-hover:translate-y-6"></div>
                                </motion.div>

                                <motion.div className="order-1 md:order-2" variants={fadeUpVariants}>
                                    <span className="inline-block text-bikitchen-orange font-bold tracking-widest uppercase text-xs mb-4 bg-bikitchen-orange/10 px-3 py-1 rounded-full">
                                        Sobre Nosotros
                                    </span>
                                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                                        ¿Quiénes somos?
                                    </h2>
                                    <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                                        <p>
                                            En <strong className="text-bikitchen-orange">BiKitchen Food</strong> creemos que comer bien debe ser simple.
                                        </p>
                                        <p>
                                            Rescatamos el sabor casero de antaño y lo combinamos con opciones saludables y prácticas para la vida moderna.
                                        </p>
                                        <p>
                                            Cocinamos con ingredientes frescos y variedad, para que cada persona y familia pueda disfrutar comida real, nutritiva y lista para calentar, sin perder tiempo ni renunciar al sabor de hogar.
                                        </p>
                                    </div>

                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl shadow-md">
                                            <Leaf className="text-bikitchen-orange" size={20} />
                                            <span className="font-semibold text-gray-700">Ingredientes frescos</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl shadow-md">
                                            <Heart className="text-red-400" size={20} />
                                            <span className="font-semibold text-gray-700">Sabor de casa</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl shadow-md">
                                            <Star className="text-yellow-400" size={20} />
                                            <span className="font-semibold text-gray-700">+12 años de experiencia</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Mission & Vision Section - NEW */}
                    <section className="py-24 bg-gradient-to-br from-amber-50/50 via-orange-50 to-bikitchen-beige relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-bikitchen-gold/10 rounded-full blur-3xl"></div>
                        <div className="container relative z-10">
                            <motion.div
                                className="text-center mb-16"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block text-bikitchen-orange font-bold tracking-widest uppercase text-xs mb-4">
                                    Nuestra Esencia
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">
                                    Misión y Visión
                                </h2>
                            </motion.div>

                            <motion.div
                                className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {/* Misión Card */}
                                <motion.div
                                    variants={fadeUpVariants}
                                    className="bg-gradient-to-br from-bikitchen-orange/5 to-bikitchen-orange/10 p-8 rounded-3xl border border-bikitchen-orange/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                                >
                                    <div className="w-16 h-16 bg-bikitchen-orange/20 rounded-2xl flex items-center justify-center mb-6">
                                        <Target className="text-bikitchen-orange" size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Misión</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Brindar soluciones prácticas, frescas y caseras a personas y familias que desean comer saludable sin complicaciones. Elaboramos paquetes listos para calentar, con recetas balanceadas y sabores de antaño, para que cada cliente pueda seguir su plan alimenticio o disfrutar comida casera con variedad y conveniencia.
                                    </p>
                                </motion.div>

                                {/* Visión Card */}
                                <motion.div
                                    variants={fadeUpVariants}
                                    className="bg-gradient-to-br from-bikitchen-gold/5 to-bikitchen-gold/10 p-8 rounded-3xl border border-bikitchen-gold/20 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                                >
                                    <div className="w-16 h-16 bg-bikitchen-gold/20 rounded-2xl flex items-center justify-center mb-6">
                                        <Eye className="text-bikitchen-gold-dark" size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Visión</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Inspirar un estilo de vida más práctico, saludable y delicioso, ofreciendo comida casera y variada que haga más fácil el día a día. Queremos que cada persona disfrute platos listos para calentar, con sabor de hogar y opciones para todos los gustos.
                                    </p>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Packs Preview Section - Updated */}
                    <section id="planes" className="py-24 bg-gradient-to-br from-bikitchen-beige via-orange-50/30 to-amber-50 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,209,197,0.05)_1px,transparent_1px)] bg-[length:32px_32px]"></div>
                        </div>

                        <div className="container relative z-10">
                            <motion.div
                                className="text-center mb-16"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block font-semibold text-bikitchen-orange mb-3 bg-bikitchen-orange/10 px-4 py-1 rounded-full">
                                    Nuestros Packs
                                </span>
                                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                                    Elige tu Plan Perfecto
                                </h2>
                                <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                                    Desde 5 comidas semanales hasta planes completos con desayuno, almuerzo y cena.
                                </p>
                            </motion.div>

                            <motion.div
                                className="grid md:grid-cols-3 gap-8 mb-16 items-center"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {[
                                    {
                                        icon: "🥗",
                                        title: "5 Comidas",
                                        subtitle: "Almuerzos de la semana",
                                        desc: "Ideal para probar o complementar tu dieta.",
                                        price: `Desde ${formatPrice(packPrices.fiveComidas)}`,
                                        features: ["7 opciones de packs", "Semanal, quincenal o mensual", "Envío disponible"],
                                        gradient: "from-orange-400 to-emerald-400",
                                        delay: 0,
                                        link: "/packs#pack-5_comidas"
                                    },
                                    {
                                        icon: "⭐",
                                        title: "10 Comidas",
                                        subtitle: "Almuerzo + Cena",
                                        desc: "Olvidate de cocinar entre semana.",
                                        price: `Desde ${formatPrice(packPrices.tenComidas)}`,
                                        features: ["Doble porción diaria", "Máxima variedad", "Ahorro garantizado"],
                                        highlight: true,
                                        gradient: "from-bikitchen-orange to-bikitchen-gold",
                                        delay: 0.1,
                                        link: "/packs#pack-10_comidas"
                                    },
                                    {
                                        icon: "👑",
                                        title: "Plan Completo",
                                        subtitle: "Todo incluido",
                                        desc: "Desayuno, almuerzo y cena listos.",
                                        price: `Desde ${formatPrice(packPrices.fifteenComidas)}`,
                                        features: ["15 comidas semanales", "Mejor precio por comida", "Máximo ahorro"],
                                        gradient: "from-orange-400 to-amber-400",
                                        delay: 0.2,
                                        link: "/packs#pack-desayuno_almuerzo_cena"
                                    }
                                ].map((plan, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className={`relative bg-white rounded-[2rem] p-8 shadow-xl hover:shadow-2xl transition-all duration-500 group ${plan.highlight
                                            ? 'md:-mt-8 md:mb-8 z-10 border-2 border-bikitchen-gold shadow-bikitchen-gold/20 scale-105'
                                            : 'border border-gray-100 hover:border-bikitchen-orange/30'
                                            }`}
                                    >
                                        {/* Fondo decorativo en hover */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-[2rem] pointer-events-none`}></div>

                                        {plan.highlight && (
                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold text-gray-900 px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 whitespace-nowrap">
                                                <Sparkles size={16} className="fill-current" />
                                                Más Popular
                                            </div>
                                        )}

                                        <div className="text-center mb-6">
                                            <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${plan.gradient} rounded-2xl flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform duration-500 mb-6 text-white`}>
                                                {plan.icon}
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.title}</h3>
                                            <p className={`text-sm font-semibold uppercase tracking-wide bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent mb-3`}>
                                                {plan.subtitle}
                                            </p>
                                            <p className="text-gray-500 text-sm leading-relaxed">
                                                {plan.desc}
                                            </p>
                                        </div>

                                        <div className="text-center mb-8 pb-8 border-b border-gray-100">
                                            <div className="text-sm text-gray-400 mb-1">Precio inicial</div>
                                            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                                {plan.price.replace('Desde ', '')}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">/semana</div>
                                        </div>

                                        <ul className="space-y-4 mb-8">
                                            {plan.features.map((feat, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 bg-gradient-to-br ${plan.gradient}`}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>

                                        <Link
                                            to={plan.link}
                                            className={`block w-full py-4 rounded-xl font-bold text-center transition-all duration-300 ${plan.highlight
                                                ? 'bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold text-gray-900 hover:shadow-lg hover:shadow-bikitchen-gold/25 hover:scale-[1.02]'
                                                : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                                                }`}
                                        >
                                            Ver opciones
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.div
                                className="text-center"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <MagneticButton as="div" className="inline-block">
                                    <Link
                                        to="/packs"
                                        className="inline-flex items-center gap-3 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold py-4 px-10 rounded-xl text-lg shadow-xl shadow-bikitchen-orange/30 hover:shadow-2xl transition-all duration-300"
                                    >
                                        Ver Todos los Packs
                                        <ArrowRight size={20} />
                                    </Link>
                                </MagneticButton>
                                <p className="text-sm text-gray-400 mt-6">
                                    *Aplican restricciones por zona.
                                </p>
                            </motion.div>
                        </div>
                    </section>

                    {/* Delivery Section - Días de Entrega */}
                    <section className="py-24 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-bikitchen-gold text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:32px_32px] opacity-30"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-bikitchen-gold/20 rounded-full blur-3xl"></div>

                        <div className="container relative z-10">
                            {/* Header */}
                            <motion.div
                                className="text-center mb-16"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block font-semibold text-white/80 mb-4 bg-white/10 px-4 py-2 rounded-full text-sm">
                                    🗓️ Logística de Precisión
                                </span>
                                <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">
                                    Días de Entrega y<br />Cierres de Pedido
                                </h2>
                                <p className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto">
                                    En BiKitchen trabajamos con contrapedido, cocinando el día anterior a la entrega para garantizar frescura y sabor casero. Podés hacer tu pedido cualquier día de la semana 💚
                                </p>
                            </motion.div>

                            {/* Cards de días - Desktop */}
                            <motion.div
                                className="hidden md:grid md:grid-cols-3 gap-6 mb-12"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {[
                                    {
                                        day: "Lunes",
                                        title: "Inicio Fresco",
                                        desc: "Recibí tus comidas de la semana.",
                                        cierre: "Viernes a las 10:00 p.m.",
                                        icon: "🗓️"
                                    },
                                    {
                                        day: "Miércoles",
                                        title: "Mitad de Semana",
                                        desc: "Recibí tus comidas de mitad de semana.",
                                        cierre: "Lunes a las 10:00 p.m.",
                                        icon: "🗓️"
                                    },
                                    {
                                        day: "Sábado",
                                        title: "Fin de Semana",
                                        desc: "Packs especiales para compartir o planificar la semana.",
                                        cierre: "Jueves a las 10:00 p.m.",
                                        icon: "🗓️"
                                    }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-default group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-4 group-hover:bg-bikitchen-gold group-hover:shadow-lg transition-all">
                                            {item.icon}
                                        </div>
                                        <h4 className="text-xl font-bold mb-2">{item.day} — {item.title}</h4>
                                        <p className="text-white/70 text-sm mb-4">{item.desc}</p>
                                        <div className="flex items-center gap-2 bg-red-500/90 text-white font-semibold text-sm px-3 py-2 rounded-lg">
                                            <span>⏰</span>
                                            <span>Cierre de pedidos: {item.cierre}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Cards de días - Mobile Accordion */}
                            <div className="md:hidden space-y-3 mb-12">
                                {[
                                    {
                                        day: "Lunes",
                                        title: "Inicio Fresco",
                                        desc: "Recibí tus comidas de la semana.",
                                        cierre: "Viernes a las 10:00 p.m."
                                    },
                                    {
                                        day: "Miércoles",
                                        title: "Mitad de Semana",
                                        desc: "Recibí tus comidas de mitad de semana.",
                                        cierre: "Lunes a las 10:00 p.m."
                                    },
                                    {
                                        day: "Sábado",
                                        title: "Fin de Semana",
                                        desc: "Packs especiales para compartir o planificar la semana.",
                                        cierre: "Jueves a las 10:00 p.m."
                                    }
                                ].map((item, idx) => (
                                    <details key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden group">
                                        <summary className="flex items-center gap-4 p-4 cursor-pointer list-none">
                                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                                                🗓️
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold">{item.day} — {item.title}</h4>
                                            </div>
                                            <Calendar size={20} className="text-white/60 group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="px-4 pb-4 pt-2 border-t border-white/10">
                                            <p className="text-white/70 text-sm mb-3">{item.desc}</p>
                                            <div className="flex items-center gap-2 bg-red-500/90 text-white font-semibold text-sm px-3 py-2 rounded-lg">
                                                <span>⏰</span>
                                                <span>Cierre de pedidos: {item.cierre}</span>
                                            </div>
                                        </div>
                                    </details>
                                ))}
                            </div>

                            {/* Nota promocional de envío gratis */}
                            <motion.div
                                className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl max-w-3xl mx-auto"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                            >
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-bikitchen-orange to-bikitchen-gold rounded-2xl flex items-center justify-center text-4xl shadow-lg flex-shrink-0">
                                        🚚
                                    </div>
                                    <div className="text-center md:text-left flex-1">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                            <span className="text-bikitchen-orange">50% OFF en envíos (Planes Mensuales)</span>
                                        </h3>
                                        <p className="text-gray-600 mb-3">
                                            Aprovechá nuestro descuento especial en envíos a todas las zonas de cobertura.
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            *Válido solo para pedidos confirmados esos días vía WhatsApp o web
                                        </p>
                                    </div>
                                    <Link
                                        to="/packs"
                                        className="flex-shrink-0 bg-bikitchen-gold hover:bg-amber-400 text-gray-900 font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg"
                                    >
                                        Ver Planes
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Testimonials Section */}
                    <TestimonialsSection />
                </main>

                <Footer />
                {/* {isAdmin && isAdmin() && <AISommelier />} */}
            </div>
        </PageTransition>
    );
}
