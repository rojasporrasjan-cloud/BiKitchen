import { useMenus } from '../context/MenusContext';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { formatPrice } from '../utils/formatters';
import IngredientScanner from '../components/IngredientScanner';
import VelocityText from '../components/VelocityText';
import SEOHead, { SEO_CONFIG, getHomeSchemas } from '../components/SEOHead';
import UrgencyBanner from '../components/UrgencyBanner';
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
import VideoHero from '../components/VideoHero';

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

export default function LandingPage() {

    const { isAdmin } = useAuth() || {};
    const { playHover, playClick } = useAudio();
    const { getWhatsAppUrl } = useWhatsApp();
    const WHATSAPP_LINK = getWhatsAppUrl('Quiero pedir 🛒');
    const isMobile = useIsMobile();
    const { isChristmasMode } = useChristmas();
    const showPromoBanner = usePromoBanner();
    const { menus } = useMenus();
    
    // Nueva lógica de detección de scroll por visibilidad del Hero
    const heroRef = useRef(null);
    const isHeroInView = useInView(heroRef, { 
        margin: "-20% 0px 0px 0px", // Activamos el cambio un poco antes d salir del todo
        amount: 0.1 
    });

    const [navbarVisible, setNavbarVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = (e) => {
            setNavbarVisible(e.detail.visible);
        };
        window.addEventListener('navbarVisibilityChange', handleVisibilityChange);
        return () => window.removeEventListener('navbarVisibilityChange', handleVisibilityChange);
    }, []);

    const fadeUpVariants = useMemo(() => createFadeUpVariants(isMobile), [isMobile]);
    const staggerContainer = useMemo(() => createStaggerContainer(isMobile), [isMobile]);

    const [packPrices, setPackPrices] = useState({
        fiveComidas: 22000,
        tenComidas: 40000,
        fifteenComidas: 65000
    });
    const [weeklyMenu, setWeeklyMenu] = useState([]);
    const [homePromo, setHomePromo] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
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


    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
    const promos = homePromo ? [
        { text: homePromo.titulo, desc: homePromo.descripcionCorta || "¡Aprovecha ahora!", link: "/promociones" },
        { text: "🎁 10% OFF al Registrarte", desc: "Regístrate hoy y obtén un 10% de descuento", link: "/login" }
    ] : [
        { text: "🎉 Promociones", desc: "Ofertas activas y descuentos", link: "/promociones" },
        { text: "🎉 Promoción Mensual", desc: "Desayunos GRATIS con tu pack mensual", link: "/promociones" },
        { text: "🎁 10% OFF al Registrarte", desc: "Regístrate hoy y obtén un 10% de descuento", link: "/login" }
    ];

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
            <SEOHead {...SEO_CONFIG.home} structuredData={getHomeSchemas()} />
            <div className="min-h-screen flex flex-col overflow-x-hidden font-sans text-gray-800 bg-bikitchen-beige">
                <Navbar forceSolid={!isHeroInView} />


                <Link
                    to={promos[currentPromoIndex]?.link || "/promociones"}
                    className={`fixed left-0 right-0 z-[35] group shadow-lg transition-all duration-300 hidden`}
                    style={{
                        transform: navbarVisible ? 'translateY(0)' : 'translateY(-200px)',
                        opacity: navbarVisible ? 1 : 0,
                        top: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + ${isMobile ? '74px' : '80px'})`
                            : (isMobile ? '74px' : '80px')
                    }}
                >
                    <div className="relative bg-gradient-to-r from-bikitchen-orange via-orange-500 to-bikitchen-gold overflow-hidden">
                        {!isMobile && (
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute top-1 left-[10%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                <div className="absolute top-2 left-[50%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                <div className="absolute top-1 left-[90%] w-1 h-1 bg-white rounded-full animate-pulse"></div>
                            </div>
                        )}

                        <div className="relative py-1.5 md:py-2">
                            <div className="container flex items-center justify-center gap-2 md:gap-4">
                                <div className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-sm md:text-base">🎁</span>
                                </div>

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

                                <div className="flex-shrink-0 flex items-center gap-1 bg-white/20 px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                                    <span className="text-white text-xs font-semibold">Ver</span>
                                    <ArrowRight size={12} className="text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>

                <main className="flex-1 pt-0">
                    {/* Hero Section - Envuelto en ref para detectar visibilidad */}
                    <motion.div ref={heroRef} className="relative">
                        <VideoHero 
                            videoSrc="/videos/hero.mp4"
                            posterSrc="/videos/hero-poster.jpg"
                            title="Comida saludable lista para comer, toda la semana."
                            subtitle="🍳 Comida casera • Saludable • Lista para calentar"
                            primaryCTA={{ text: "Ver Planes y Precios", link: "/packs" }}
                            secondaryCTA={{ text: "Ver Promociones 🎁", link: "/promociones" }}
                        />
                    </motion.div>

                    {/* ── Sección "Cómo Comprar" — Video tutorial ── */}
                    {/* Para activar: reemplaza YOUTUBE_VIDEO_ID con el ID del video (ej: "dQw4w9WgXcQ") */}
                    {(() => {
                        const YOUTUBE_VIDEO_ID = ''; // ← pega aquí el ID de YouTube cuando esté listo
                        return (
                            <section className="py-14 md:py-20 bg-gray-950">
                                <div className="container px-4 md:px-8 mx-auto">
                                    <motion.div
                                        className="text-center mb-8 md:mb-10"
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Paso a paso</span>
                                        <h2 className="text-2xl md:text-4xl font-black text-white mt-2">¿Cómo Comprar?</h2>
                                        <p className="text-gray-400 text-sm md:text-base mt-2 max-w-md mx-auto">Te explicamos todo en menos de 2 minutos</p>
                                    </motion.div>

                                    <motion.div
                                        className="max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.1 }}
                                    >
                                        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                                            {YOUTUBE_VIDEO_ID ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
                                                    title="Cómo Comprar en BiKitchen"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    className="absolute inset-0 w-full h-full border-0"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center gap-4">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30">
                                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-white font-black text-lg">Video próximamente</p>
                                                        <p className="text-gray-400 text-sm mt-1">Estamos preparando el tutorial</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </section>
                        );
                    })()}

                    {/* Sección "Ventajas BiKitchen" */}
                    <section className="py-20 bg-white">
                        <div className="container px-4 md:px-8">
                            <motion.div
                                className="text-center mb-12"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block text-bikitchen-orange font-black tracking-widest uppercase text-xs mb-4">
                                    ¿Por qué elegirnos?
                                </span>
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                    La ventaja de comer bien.
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
                                    { icon: "🥗", text: "Porciones pensadas por nutricionistas" },
                                    { icon: "🚚", text: "Entrega 3 veces por semana a domicilio" },
                                    { icon: "🍲", text: "Sabor casero, listo en minutos" },
                                    { icon: "⏰", text: "Recupera hasta 10h de tu semana" }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="bg-gray-50 rounded-3xl p-8 transition-all duration-300 flex flex-col items-center text-center gap-4 border border-gray-100 hover:shadow-lg"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                                            {item.icon}
                                        </div>
                                        <p className="text-gray-900 font-bold text-lg leading-snug">{item.text}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </section>

                    {/* Sección "Sobre Nosotros" Compacta - Rediseño Light */}
                    <section className="py-24 bg-white text-gray-900 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-50 to-transparent pointer-events-none" />
                        <div className="container px-4 md:px-8 relative z-10">
                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true }}
                                    variants={fadeUpVariants}
                                >
                                    <span className="text-bikitchen-orange font-bold tracking-widest uppercase text-xs mb-4 block">Nuestra Esencia</span>
                                    <h2 className="text-4xl md:text-5xl font-black mb-8 tracking-tight text-gray-900">Pasión por lo auténtico.</h2>
                                    <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                        En <span className="text-gray-900 font-bold">BiKitchen</span> rescatamos el sabor casero de antaño y lo combinamos con nutrición moderna para ofrecerte platos balanceados listos para disfrutar.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                            <Target className="text-bikitchen-orange mb-3" size={24} />
                                            <h3 className="font-bold mb-2 text-gray-900">Misión</h3>
                                            <p className="text-xs text-gray-500">Comida casera sin complicaciones para tu día a día.</p>
                                        </div>
                                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                            <Eye className="text-bikitchen-orange mb-3" size={24} />
                                            <h3 className="font-bold mb-2 text-gray-900">Visión</h3>
                                            <p className="text-xs text-gray-500">Inspirar un estilo de vida saludable y práctico.</p>
                                        </div>
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="relative hidden lg:block"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-orange-100/50 rounded-[3.5rem] blur-2xl -z-10"  aria-hidden="true"/>
                                        <img
                                            src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                                            alt="Cocina"
                                            className="rounded-[3rem] shadow-2xl relative z-10 border-8 border-white"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* Packs Preview Section */}
                    <section id="planes" className="py-24 bg-gray-50 relative overflow-hidden">
                        {/* Urgencia + prueba social */}
                        <div className="container px-4 md:px-8 mb-6">
                            <UrgencyBanner className="rounded-2xl overflow-hidden shadow-md" />
                            <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">⭐</span>
                                    <span className="text-sm font-bold text-gray-700">+300 familias en Costa Rica</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🚚</span>
                                    <span className="text-sm font-bold text-gray-700">Lunes, Miércoles y Sábados</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🔒</span>
                                    <span className="text-sm font-bold text-gray-700">Sin suscripción obligatoria</span>
                                </div>
                            </div>
                        </div>

                        <div className="container relative z-10 px-4 md:px-8">
                            <motion.div
                                className="text-center mb-16"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block font-semibold text-bikitchen-orange mb-3 px-4 py-1 rounded-full bg-orange-50">
                                    Nuestros Packs
                                </span>
                                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
                                    Elige tu Plan Perfecto
                                </h2>
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
                                        link: "/packs#pack-5_comidas"
                                    },
                                    {
                                        icon: "⭐",
                                        title: "Almuerzo y Cena",
                                        subtitle: "Lunes a Viernes",
                                        desc: "Olvidate de cocinar entre semana.",
                                        price: `Desde ${formatPrice(packPrices.tenComidas)}`,
                                        features: ["Doble porción diaria", "Máxima variedad", "Ahorro garantizado"],
                                        highlight: true,
                                        gradient: "from-bikitchen-orange to-bikitchen-gold",
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
                                                : 'bg-gray-50 text-gray-900 hover:bg-gray-100 hover:border-bikitchen-orange/30 border border-gray-100'
                                                }`}
                                        >
                                            {plan.highlight ? '🛒 Quiero este pack' : 'Ver este pack →'}
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
                                <div className="mt-4">
                                    <Link
                                        to="/calculadora"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-bikitchen-orange transition-colors duration-200 underline underline-offset-4 decoration-dashed"
                                    >
                                        💰 ¿Vale la pena? Calculá cuánto ahorrás
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Delivery Section - Días de Entrega Compacto */}
                    <section className="py-20 bg-white">
                        <div className="container px-4 md:px-8">
                            <motion.div
                                className="text-center mb-12"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
                                    Días de Entrega y Cierres
                                </h2>
                                <p className="text-gray-500 max-w-xl mx-auto font-medium">
                                    Cocinamos bajo pedido para garantizar frescura absoluta.
                                </p>
                            </motion.div>

                            <motion.div
                                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {[
                                    { day: "Lunes", cierre: "Viernes 10:00 PM", icon: "🗓️" },
                                    { day: "Miércoles", cierre: "Lunes 10:00 PM", icon: "🗓️" },
                                    { day: "Sábado", cierre: "Jueves 10:00 PM", icon: "🗓️" }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center gap-4 shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900">{item.day}</h3>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Cierre: {item.cierre}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.div
                                className="bg-gray-50 rounded-2xl p-6 border-l-4 border-bikitchen-orange shadow-sm flex flex-col md:flex-row items-center gap-4 max-w-2xl mx-auto"
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                            >
                                <div className="text-2xl">🚚</div>
                                <p className="text-sm font-bold text-gray-800 text-center md:text-left">
                                    <span className="text-bikitchen-orange">50% OFF en envíos</span> para todos nuestros planes mensuales.
                                </p>
                            </motion.div>
                        </div>
                    </section>

                    {/* Testimonials Section */}
                    <TestimonialsSection />

                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
