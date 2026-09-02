import React from 'react';
import { usePromoBanner } from '../hooks/usePromoBanner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import { ShoppingCart, ChefHat, Truck, Flame, MessageCircle, Clock, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';

const fadeUpVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2 }
    }
};

// WhatsApp link se genera dinámicamente usando el hook useWhatsApp

const steps = [
    {
        icon: ShoppingCart,
        number: "1",
        title: "Hacés tu pedido",
        description: "Elegí tu pack en la web o escribinos por WhatsApp. Te confirmamos disponibilidad y precio.",
        color: "from-bikitchen-orange to-orange-400",
        bgColor: "bg-bikitchen-orange/10"
    },
    {
        icon: ChefHat,
        number: "2",
        title: "Cocinamos el día anterior",
        description: "Preparamos tu comida con ingredientes frescos, el día antes de la entrega para máxima frescura.",
        color: "from-orange-400 to-amber-400",
        bgColor: "bg-orange-100"
    },
    {
        icon: Truck,
        number: "3",
        title: "Te entregamos",
        description: "Recibís tus comidas los lunes, miércoles o sábados según tu zona y preferencia.",
        color: "from-bikitchen-gold to-amber-400",
        bgColor: "bg-bikitchen-gold/10"
    },
    {
        icon: Flame,
        number: "4",
        title: "Calentás y disfrutás",
        description: "Solo calentá 3-4 minutos en microondas o sartén. ¡Listo para comer!",
        color: "from-red-400 to-orange-400",
        bgColor: "bg-red-50"
    }
];

const deliveryDays = [
    {
        day: "Lunes",
        title: "Inicio Fresco",
        description: "Recibí tus comidas de la semana.",
        cierre: "Viernes a las 10:00 p.m.",
        icon: "🗓️"
    },
    {
        day: "Miércoles",
        title: "Mitad de Semana",
        description: "Recibí tus comidas de mitad de semana.",
        cierre: "Lunes a las 10:00 p.m.",
        icon: "🗓️"
    },
    {
        day: "Sábado",
        title: "Fin de Semana",
        description: "Packs especiales para compartir o planificar la semana.",
        cierre: "Jueves a las 10:00 p.m.",
        icon: "🗓️"
    }
];

const faqs = [
    {
        question: "¿Cuánto duran las comidas?",
        answer: "Las comidas duran hasta 5 días refrigeradas. También podés congelarlas para mayor duración."
    },
    {
        question: "¿Puedo cambiar platos del menú?",
        answer: "Sí, ofrecemos hasta 2 cambios sin costo adicional en la mayoría de packs."
    },
    {
        question: "¿Hacen entregas a mi zona?",
        answer: "Cubrimos GAM y algunas zonas adicionales. Consultá por WhatsApp para confirmar tu zona."
    },
    {
        question: "¿Cómo pago?",
        answer: "Aceptamos SINPE Móvil, transferencia bancaria y pago en la página (tarjeta)."
    }
];

export default function ComoFuncionaPage() {
    const showPromoBanner = usePromoBanner();
    const { getWhatsAppUrl } = useWhatsApp();
    const WHATSAPP_LINK = getWhatsAppUrl('Quiero pedir 🛒');

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.comoFunciona}
                structuredData={getBreadcrumbSchema([{ name: 'Cómo Funciona', url: 'https://www.bikitchencr.com/como-funciona' }])}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <header
                    className="relative pt-28 pb-20 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 112px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-400/10 via-white/10 to-transparent rounded-full blur-3xl" aria-hidden="true"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    <div className="container relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                            <motion.span
                                className="inline-block mb-6 px-6 py-3 bg-white/20 rounded-full text-base font-bold text-white border border-white/30 shadow-xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                ❓ Preguntas Frecuentes
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
                                ¿Cómo Funciona BiKitchen?
                            </h1>
                            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto font-medium leading-relaxed">
                                Comida casera lista para calentar, entregada en tu puerta. Así de simple.
                            </p>
                        </motion.div>
                    </div>
                </header>

                <main className="pb-20">
                    {/* Steps Section */}
                    <section className="py-16 md:py-24">
                        <div className="container">
                            <motion.div
                                className="text-center mb-20"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                                    4 Pasos Simples
                                </h2>
                                <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                                    Desde tu pedido hasta tu mesa, todo pensado para hacerte la vida más fácil
                                </p>
                            </motion.div>

                            <motion.div
                                className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {steps.map((step, idx) => {
                                    const Icon = step.icon;
                                    return (
                                        <motion.div
                                            key={idx}
                                            variants={fadeUpVariants}
                                            className="relative"
                                        >
                                            {/* Connector line (hidden on mobile and last item) */}
                                            {idx < steps.length - 1 && (
                                                <div className="hidden lg:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-gray-200 to-transparent"></div>
                                            )}

                                            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-4 border-2 border-orange-100 text-center relative z-10">
                                                {/* Number badge */}
                                                <div className={`absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-black text-lg shadow-xl`}>
                                                    {step.number}
                                                </div>

                                                {/* Icon */}
                                                <div className={`w-24 h-24 mx-auto ${step.bgColor} rounded-3xl flex items-center justify-center mb-6 shadow-lg`}>
                                                    <Icon className={`w-12 h-12 bg-gradient-to-r ${step.color} bg-clip-text`} style={{ color: idx === 0 ? '#FF671D' : idx === 1 ? '#F97316' : idx === 2 ? '#E9A84A' : '#EF4444' }} />
                                                </div>

                                                <h3 className="text-2xl font-black text-gray-900 mb-4 leading-tight">
                                                    {step.title}
                                                </h3>
                                                <p className="text-gray-600 text-base leading-relaxed font-medium">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    </section>

                    {/* Video Section */}
                    <section className="py-16 md:py-20 bg-gray-50">
                        <div className="container">
                            <motion.div
                                className="text-center mb-10"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block mb-3 px-4 py-1.5 bg-orange-100 text-bikitchen-orange rounded-full text-sm font-bold">
                                    🎥 Míralo en acción
                                </span>
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                                    Así funciona BiKitchen
                                </h2>
                                <p className="text-gray-500 max-w-xl mx-auto">
                                    En menos de 2 minutos entendés todo el proceso, desde el pedido hasta tu mesa.
                                </p>
                            </motion.div>

                            <motion.div
                                className="max-w-3xl mx-auto"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                {/* ── Video de YouTube ──
                                     Para activarlo: cambiá YOUTUBE_VIDEO_ID por el ID real de tu video.
                                     Ejemplo: si tu video es https://youtu.be/dQw4w9WgXcQ
                                     el ID es: dQw4w9WgXcQ
                                ── */}
                                {(() => {
                                    const YOUTUBE_VIDEO_ID = 'VIDEO_ID_AQUI'; // ← Pegá tu ID aquí
                                    const hasVideo = YOUTUBE_VIDEO_ID !== 'VIDEO_ID_AQUI' && YOUTUBE_VIDEO_ID.trim() !== '';
                                    return hasVideo ? (
                                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
                                            <iframe
                                                className="absolute inset-0 w-full h-full"
                                                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1&color=white`}
                                                title="Cómo funciona BiKitchen — Comida saludable a domicilio en Costa Rica"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        /* Placeholder elegante — visible hasta que se agregue el video */
                                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-800 via-orange-950 to-gray-900 aspect-video flex flex-col items-center justify-center gap-4">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,103,29,0.15)_0%,transparent_70%)]" />
                                            <div className="relative flex flex-col items-center gap-4 text-center px-6">
                                                <div className="w-20 h-20 bg-gradient-to-br from-bikitchen-orange to-bikitchen-gold rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/40">
                                                    <svg className="w-9 h-9 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z"/>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white font-black text-xl mb-1">Video explicativo</p>
                                                    <p className="text-white/60 text-sm">Próximamente — te mostramos todo el proceso en 90 segundos</p>
                                                </div>
                                                <div className="flex flex-wrap gap-3 justify-center mt-2">
                                                    {['📦 Elegís tu pack', '👨‍🍳 Cocinamos fresco', '🚚 Lo entregamos', '🔥 Solo calentás'].map((step) => (
                                                        <span key={step} className="px-3 py-1.5 bg-white/10 text-white text-xs font-semibold rounded-full border border-white/20">
                                                            {step}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* CTA debajo del video */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                                    <Link
                                        to="/packs"
                                        className="inline-flex items-center justify-center gap-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300"
                                    >
                                        Ver Planes y Precios
                                    </Link>
                                    <a
                                        href={WHATSAPP_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold py-4 px-8 rounded-xl shadow-lg border border-gray-200 transition-all duration-300"
                                    >
                                        <MessageCircle size={18} />
                                        Tengo una pregunta
                                    </a>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Delivery Days Section */}
                    <section className="py-16 md:py-24 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-bikitchen-gold text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:32px_32px] opacity-30"></div>

                        <div className="container relative z-10">
                            <motion.div
                                className="text-center mb-12"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <span className="inline-block mb-4 px-4 py-2 bg-white/15 rounded-full text-sm font-medium">
                                    <Calendar className="inline w-4 h-4 mr-2" />
                                    Días de Entrega
                                </span>
                                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                    ¿Cuándo recibís tu pedido?
                                </h2>
                                <p className="text-white/80 max-w-xl mx-auto">
                                    Trabajamos con contrapedido para garantizar frescura. Podés hacer tu pedido cualquier día.
                                </p>
                            </motion.div>

                            <motion.div
                                className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {deliveryDays.map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="bg-white/15 rounded-2xl p-6 border border-white/20 hover:bg-white/25 transition-all duration-300"
                                    >
                                        <div className="text-4xl mb-4">{item.icon}</div>
                                        <h3 className="text-xl font-bold mb-2">{item.day}</h3>
                                        <p className="text-sm font-medium text-white/80 mb-3">{item.title}</p>
                                        <p className="text-sm text-white/70 mb-4">{item.description}</p>
                                        <div className="flex items-center gap-2 bg-red-500/90 text-white text-sm font-semibold px-3 py-2 rounded-lg">
                                            <span>⏰</span>
                                            <span>Cierre de pedidos: {item.cierre}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Free shipping note */}
                            <motion.div
                                className="mt-12 bg-white rounded-2xl p-6 md:p-8 shadow-2xl max-w-2xl mx-auto"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                                    <div className="w-16 h-16 bg-gradient-to-br from-bikitchen-orange to-bikitchen-gold rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                                        🚚
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                            <span className="text-bikitchen-orange">50% OFF en envíos (Planes Mensuales)</span>
                                        </h3>
                                        <p className="text-gray-600 text-sm">
                                            Aprovechá nuestro descuento especial en envíos a todas las zonas de cobertura.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* FAQs Section */}
                    <section className="py-16 md:py-24">
                        <div className="container">
                            <motion.div
                                className="text-center mb-12"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeUpVariants}
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                                    Preguntas Frecuentes
                                </h2>
                            </motion.div>

                            <motion.div
                                className="max-w-2xl mx-auto space-y-4"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={staggerContainer}
                            >
                                {faqs.map((faq, idx) => (
                                    <motion.details
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="group bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
                                    >
                                        <summary className="flex items-center justify-between p-5 cursor-pointer list-none font-semibold text-gray-900">
                                            {faq.question}
                                            <span className="ml-4 text-bikitchen-orange group-open:rotate-180 transition-transform">
                                                ▼
                                            </span>
                                        </summary>
                                        <div className="px-5 pb-5 text-gray-600">
                                            {faq.answer}
                                        </div>
                                    </motion.details>
                                ))}
                            </motion.div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-16">
                        <div className="container">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="bg-gradient-to-r from-bikitchen-orange/10 to-orange-100/50 rounded-3xl p-10 md:p-16 text-center border border-bikitchen-orange/20"
                            >
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                                    ¿Listo para probar BiKitchen?
                                </h3>
                                <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                                    Elegí tu pack y empezá a disfrutar comida casera sin complicaciones.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        to="/packs"
                                        className="inline-flex items-center justify-center gap-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        Ver Planes Semanales
                                    </Link>
                                    <a
                                        href={WHATSAPP_LINK}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 bg-bikitchen-gold hover:bg-amber-400 text-gray-900 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <MessageCircle size={20} />
                                        Escribir por WhatsApp
                                    </a>
                                </div>
                            </motion.div>
                        </div>
                    </section>
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
