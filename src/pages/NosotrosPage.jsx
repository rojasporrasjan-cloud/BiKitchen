import React from 'react';
import { usePromoBanner } from '../hooks/usePromoBanner';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import { Heart, Leaf, Target, Eye, Users, Award, Utensils, Clock } from 'lucide-react';

// Animation variants
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
        transition: { staggerChildren: 0.15 }
    }
};

export default function NosotrosPage() {
    const showPromoBanner = usePromoBanner();
    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.nosotros}
                structuredData={getBreadcrumbSchema([{ name: 'Quiénes Somos', url: 'https://bikitchencr.com/nosotros' }])}
            />
            <div className="min-h-screen bg-bikitchen-beige">
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
                                className="inline-block mb-6 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-base font-bold text-white border border-white/30 shadow-xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                🏠 Conoce Nuestra Historia
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl">
                                Sobre Nosotros
                            </h1>
                            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto font-medium leading-relaxed">
                                Somos BiKitchen, tu aliado en alimentación saludable y casera
                            </p>
                        </motion.div>
                    </div>
                </header>

                <main>
                    {/* Quiénes Somos Section */}
                    <section className="py-24 bg-white">
                        <div className="container">
                            <motion.div
                                className="grid md:grid-cols-2 gap-16 items-center"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={staggerContainer}
                            >
                                <motion.div variants={fadeUpVariants} className="order-2 md:order-1">
                                    <div className="relative">
                                        <img
                                            src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                            alt="Equipo BiKitchen cocinando"
                                            className="rounded-3xl shadow-2xl w-full object-cover h-[400px]"
                                        />
                                        <div className="absolute -bottom-6 -right-6 bg-bikitchen-gold text-gray-900 p-4 rounded-2xl shadow-xl">
                                            <p className="font-bold text-lg">+5 años</p>
                                            <p className="text-sm">de experiencia</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div variants={fadeUpVariants} className="order-1 md:order-2">
                                    <span className="inline-block text-orange-600 font-black text-sm mb-4 tracking-wide uppercase">
                                        ¿Quiénes Somos?
                                    </span>
                                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                                        Tu Cocina de Confianza
                                    </h2>
                                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                        BiKitchen nació de la pasión por la comida casera y el deseo de ayudar a las personas a comer mejor sin complicaciones. Somos un equipo dedicado a preparar alimentos frescos, nutritivos y deliciosos, listos para calentar y disfrutar.
                                    </p>
                                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                        Creemos que comer saludable no tiene que ser difícil ni aburrido. Por eso, cada semana diseñamos menús variados con ingredientes de calidad, preparados con amor y entregados directamente en tu puerta.
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 shadow-lg">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                                                <Leaf className="text-white" size={24} />
                                            </div>
                                            <span className="font-black text-gray-900">Ingredientes frescos</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 shadow-lg">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                                                <Heart className="text-white" size={24} />
                                            </div>
                                            <span className="font-black text-gray-900">Sabor de casa</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Misión y Visión Section */}
                    <section className="py-24 bg-bikitchen-beige">
                        <div className="container">
                            <motion.div
                                className="text-center mb-16"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <span className="inline-block text-bikitchen-orange font-semibold text-sm mb-4 tracking-wide">
                                    NUESTRO PROPÓSITO
                                </span>
                                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
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
                                    className="bg-white p-8 rounded-3xl shadow-xl border-2 border-orange-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                                        <Target className="text-white" size={36} />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-4">
                                        Nuestra Misión
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Facilitar el acceso a una alimentación saludable, casera y deliciosa para personas con estilos de vida ocupados. Queremos que cada comida sea un momento de bienestar, sin que tengas que pasar horas en la cocina.
                                    </p>
                                    <ul className="mt-6 space-y-3">
                                        <li className="flex items-center gap-3 text-gray-600">
                                            <Utensils className="text-bikitchen-orange" size={18} />
                                            <span>Comida casera de calidad</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-gray-600">
                                            <Clock className="text-bikitchen-orange" size={18} />
                                            <span>Ahorro de tiempo</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-gray-600">
                                            <Heart className="text-bikitchen-orange" size={18} />
                                            <span>Bienestar integral</span>
                                        </li>
                                    </ul>
                                </motion.div>

                                {/* Visión Card */}
                                <motion.div
                                    variants={fadeUpVariants}
                                    className="bg-white p-8 rounded-3xl shadow-xl border-2 border-orange-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                                        <Eye className="text-white" size={36} />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-4">
                                        Nuestra Visión
                                    </h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        Ser la opción número uno en Costa Rica para quienes buscan alimentarse bien sin sacrificar tiempo ni sabor. Aspiramos a transformar la manera en que las familias ticas disfrutan de la comida casera.
                                    </p>
                                    <ul className="mt-6 space-y-3">
                                        <li className="flex items-center gap-3 text-gray-600">
                                            <Award className="text-bikitchen-orange" size={18} />
                                            <span>Líderes en comida saludable</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-gray-600">
                                            <Users className="text-bikitchen-orange" size={18} />
                                            <span>Comunidad BiKitchen</span>
                                        </li>
                                        <li className="flex items-center gap-3 text-gray-600">
                                            <Leaf className="text-bikitchen-orange" size={18} />
                                            <span>Impacto positivo</span>
                                        </li>
                                    </ul>
                                </motion.div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Valores Section */}
                    <section className="py-24 bg-white">
                        <div className="container">
                            <motion.div
                                className="text-center mb-16"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <span className="inline-block text-bikitchen-orange font-semibold text-sm mb-4 tracking-wide">
                                    LO QUE NOS DEFINE
                                </span>
                                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                                    Nuestros Valores
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
                                    { icon: '🌿', title: 'Frescura', desc: 'Ingredientes frescos y de temporada en cada preparación.' },
                                    { icon: '❤️', title: 'Amor', desc: 'Cada plato es preparado con dedicación y cariño.' },
                                    { icon: '⚡', title: 'Practicidad', desc: 'Soluciones fáciles para tu día a día.' },
                                    { icon: '🎯', title: 'Calidad', desc: 'Estándares altos en cada proceso.' }
                                ].map((valor, idx) => (
                                    <motion.div
                                        key={idx}
                                        variants={fadeUpVariants}
                                        className="text-center p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 group border-2 border-orange-100 hover:-translate-y-2"
                                    >
                                        <span className="text-6xl mb-6 block group-hover:scale-110 transition-transform duration-300">{valor.icon}</span>
                                        <h3 className="text-2xl font-black text-gray-900 mb-3">{valor.title}</h3>
                                        <p className="text-gray-600 text-base font-medium">{valor.desc}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-20 bg-gradient-to-r from-bikitchen-orange to-bikitchen-orange-dark text-white">
                        <div className="container text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                    ¿Listo para comer mejor?
                                </h2>
                                <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                                    Descubre nuestros packs semanales y empieza a disfrutar de comida casera y saludable.
                                </p>
                                <a
                                    href="/packs"
                                    className="inline-flex items-center gap-2 bg-bikitchen-gold hover:bg-bikitchen-gold-dark text-gray-900 font-bold px-8 py-4 rounded-xl text-lg shadow-lg transition-all duration-300 hover:-translate-y-1"
                                >
                                    Ver Packs
                                    <span>→</span>
                                </a>
                            </motion.div>
                        </div>
                    </section>
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
