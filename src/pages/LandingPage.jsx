import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LiquidHero from '../components/LiquidHero';
import IngredientScanner from '../components/IngredientScanner';
import VelocityText from '../components/VelocityText';
import { ArrowRight, Star, Leaf, Heart, Calendar, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAudio } from '../context/AudioContext';
import PageTransition from '../components/PageTransition';
import MagneticButton from '../components/MagneticButton';
import AISommelier from '../components/AISommelier';

export default function LandingPage() {
    const { playHover, playClick } = useAudio();

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col overflow-x-hidden font-sans text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900">
                <Navbar />
                
                <main className="flex-1">
                    {/* Hero Section */}
                    <header className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                        {/* Background decorations */}
                        <div className="absolute top-20 right-0 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl"></div>
                        
                        <div className="container grid lg:grid-cols-12 gap-12 items-center relative z-10">
                            <div className="lg:col-span-7 relative">
                                <span className="inline-block font-semibold text-lg text-amber-600 mb-4 tracking-wide bg-amber-100 px-4 py-1 rounded-full">Est. 2024 — Costa Rica</span>
                                <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-8 leading-[1.1] tracking-tight">
                                    <VelocityText intensity={0.5}>
                                        <span className="text-orange-500">Comida Real,</span>
                                    </VelocityText> <br />
                                    <span className="font-normal text-gray-700 dark:text-gray-300">
                                        <VelocityText intensity={0.3}>para tu día a día.</VelocityText>
                                    </span>
                                </h1>
                                <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 max-w-xl leading-relaxed">
                                    Planes pensados para cómo vives: desayunos, menús individuales, packs completos y opciones bajas en carbohidratos, vegetarianas, keto y más.
                                </p>
                                <p className="text-sm uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-10 font-medium">
                                    Cocinamos en BiKitchen — Entregamos en tu puerta
                                </p>

                                <div className="flex flex-wrap gap-4 items-center">
                                    <MagneticButton as="div" className="inline-block">
                                        <Link
                                            to="/packs"
                                            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-xl shadow-orange-500/30 hover:shadow-2xl transition-all duration-300"
                                        >
                                            Elegir mi Pack
                                            <ArrowRight size={20} />
                                        </Link>
                                    </MagneticButton>
                                    <Link
                                        to="/menu"
                                        className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors font-medium group"
                                    >
                                        <span className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center group-hover:border-orange-500 group-hover:bg-orange-50 transition-all">
                                            <ArrowRight size={16} />
                                        </span>
                                        Ver menú individual
                                    </Link>
                                </div>
                            </div>

                            <div className="lg:col-span-5 relative">
                                <div className="relative z-10 group">
                                    <LiquidHero
                                        src="https://images.unsplash.com/photo-1543339308-43e59d6b73a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85"
                                        alt="Gourmet Dish"
                                        className="rounded-3xl shadow-2xl w-full object-cover h-[500px] lg:h-[600px] transform transition-transform duration-700 group-hover:scale-[1.02]"
                                    />
                                    <div className="absolute -bottom-6 -left-6 bg-white p-5 shadow-xl max-w-xs rounded-2xl border border-gray-100">
                                        <p className="font-bold text-lg text-orange-500 mb-2">"El sabor es memoria."</p>
                                        <div className="flex text-amber-400">
                                            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} fill="currentColor" />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Philosophy Section */}
                    <section className="py-24 bg-white dark:bg-gray-900 relative">
                        <div className="container">
                            <div className="grid md:grid-cols-2 gap-16 items-center">
                                <div className="relative group">
                                    <img
                                        src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                        alt="Fresh Ingredients"
                                        className="w-full h-[450px] object-cover rounded-3xl shadow-xl grayscale group-hover:grayscale-0 transition-all duration-1000"
                                    />
                                    <div className="absolute inset-0 border-2 border-orange-300/30 rounded-3xl transform translate-x-4 translate-y-4 -z-10 transition-transform duration-500 group-hover:translate-x-6 group-hover:translate-y-6"></div>
                                </div>

                                <div>
                                    <span className="text-orange-500 font-bold tracking-widest uppercase text-xs mb-4 block">Filosofía</span>
                                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                                        Del Mercado <br />
                                        <span className="text-gray-500 dark:text-gray-400">a tu Mesa.</span>
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                                        Creemos que la comida saludable no debe ser aburrida. En BiKitchen, seleccionamos cada ingrediente a mano, priorizando productores locales y vegetales de temporada.
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                                        Nos encargamos de todo: planear, comprar, cocinar y empacar. Tú solo eliges el tipo de menú que mejor se ajusta a tu estilo de vida.
                                    </p>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="group">
                                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
                                                <Leaf className="text-orange-500 group-hover:text-white transition-colors" size={24} />
                                            </div>
                                            <h4 className="font-bold mb-1 text-gray-900 dark:text-white">100% Natural</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Sin conservantes ni aditivos.</p>
                                        </div>
                                        <div className="group">
                                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-500 transition-colors">
                                                <Heart className="text-amber-500 group-hover:text-white transition-colors" size={24} />
                                            </div>
                                            <h4 className="font-bold mb-1 text-gray-900 dark:text-white">Hecho con Amor</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Cocina artesanal diaria.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Packs Preview Section */}
                    <section id="planes" className="py-24 bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-30">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,103,29,0.05)_1px,transparent_1px)] bg-[length:32px_32px]"></div>
                        </div>

                        <div className="container relative z-10">
                            <div className="text-center mb-16">
                                <span className="inline-block font-semibold text-amber-600 mb-3 bg-amber-100 px-4 py-1 rounded-full">Nuestros Packs</span>
                                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                                    <VelocityText intensity={0.4}>Elige tu Plan Perfecto</VelocityText>
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-lg">
                                    Desde 5 comidas semanales hasta planes completos con desayuno, almuerzo y cena.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8 mb-12">
                                {[
                                    {
                                        icon: "🥗",
                                        title: "5 Comidas",
                                        desc: "Lunes a Viernes",
                                        price: "Desde ₡22,000",
                                        features: ["7 opciones de packs", "Semanal, quincenal o mensual", "Envío disponible"]
                                    },
                                    {
                                        icon: "🍽️",
                                        title: "10 Comidas",
                                        desc: "Almuerzo y Cena",
                                        price: "Desde ₡40,000",
                                        features: ["Doble porción diaria", "Máxima variedad", "Ahorro garantizado"],
                                        highlight: true
                                    },
                                    {
                                        icon: "🌅",
                                        title: "Plan Completo",
                                        desc: "Desayuno, Almuerzo y Cena",
                                        price: "Desde ₡65,000",
                                        features: ["15 comidas semanales", "Envío gratis mensual*", "Máximo ahorro"]
                                    }
                                ].map((plan, idx) => (
                                    <div
                                        key={idx}
                                        className={`bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-700 ${plan.highlight ? 'ring-2 ring-orange-500 ring-offset-4 dark:ring-offset-gray-900' : ''
                                            }`}
                                    >
                                        {plan.highlight && (
                                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center py-2 -mx-8 -mt-8 mb-6 rounded-t-2xl text-xs font-bold uppercase tracking-wider">
                                                ⭐ Más Popular
                                            </div>
                                        )}
                                        <div className="text-6xl mb-4 text-center">{plan.icon}</div>
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{plan.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">{plan.desc}</p>
                                        <div className="text-3xl font-bold text-orange-500 mb-6 text-center">{plan.price}</div>
                                        <ul className="space-y-3 mb-6">
                                            {plan.features.map((feat, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <span className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-xs">✓</span>
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            <div className="text-center">
                                <MagneticButton as="div" className="inline-block">
                                    <Link
                                        to="/packs"
                                        className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-xl shadow-orange-500/30 hover:shadow-2xl transition-all duration-300"
                                    >
                                        Ver Todos los Packs
                                        <ArrowRight size={20} />
                                    </Link>
                                </MagneticButton>
                                <p className="text-sm text-gray-400 mt-6">
                                    *Aplican restricciones por zona.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Delivery Section */}
                    <section className="py-24 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:32px_32px] opacity-30"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
                        <div className="container relative z-10">
                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                <div>
                                    <span className="inline-block font-semibold text-white/80 mb-4 bg-white/10 px-4 py-1 rounded-full">Logística de Precisión</span>
                                    <h2 className="text-4xl lg:text-5xl font-bold mb-8">Entregas Frescas,<br />Tres Veces por Semana.</h2>
                                    <p className="text-white/80 text-lg leading-relaxed mb-10">
                                        Cocinamos el día anterior a la entrega para garantizar la máxima frescura.
                                    </p>

                                    <div className="space-y-6">
                                        {[
                                            { day: "Lunes", title: "Inicio Fresco", desc: "Recibe tus comidas para Lun-Mar." },
                                            { day: "Miércoles", title: "Mitad de Semana", desc: "Recibe tus comidas para Jue-Vie." },
                                            { day: "Sábado", title: "Fin de Semana", desc: "Packs especiales para compartir." }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-4 group">
                                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-orange-500 transition-all">
                                                    <Calendar size={22} />
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-bold mb-1">{item.day} — {item.title}</h4>
                                                    <p className="text-white/60 text-sm">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative">
                                    <img
                                        src="https://images.unsplash.com/photo-1586816001966-79b736744398?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                        alt="Delivery Packaging"
                                        className="relative z-10 rounded-3xl shadow-2xl"
                                    />
                                    <div className="absolute -bottom-6 -right-6 bg-white text-gray-800 p-6 shadow-xl rounded-2xl max-w-xs z-20">
                                        <div className="flex items-center gap-4 mb-3">
                                            <Truck className="text-orange-500" size={28} />
                                            <div>
                                                <h5 className="font-bold text-gray-900">Envíos Gratis</h5>
                                                <p className="text-xs text-gray-500">En pedidos mayores a ₡40,000</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-orange-500 h-full w-3/4 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Menu Preview */}
                    <section className="py-24 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                        <div className="container mb-12 flex justify-between items-end">
                            <div>
                                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Menú de la Semana</h2>
                                <p className="text-gray-500 dark:text-gray-400">Sabores que inspiran tu día a día.</p>
                            </div>
                            <MagneticButton as="div" className="hidden md:inline-block">
                                <Link to="/menu" className="flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors">
                                    Ver Todo el Menú <ArrowRight size={18} />
                                </Link>
                            </MagneticButton>
                        </div>

                        <div className="container">
                            <div className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-hide">
                                {[
                                    {
                                        title: "Salmón Glaseado",
                                        desc: "Con espárragos y quinoa real.",
                                        img: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                                        data: { cal: 450, protein: 32, carbs: 45 }
                                    },
                                    {
                                        title: "Bowl Mediterráneo",
                                        desc: "Falafel casero, hummus y tabule.",
                                        img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                                        data: { cal: 380, protein: 18, carbs: 55 }
                                    },
                                    {
                                        title: "Pollo al Romero",
                                        desc: "Papas rústicas y vegetales asados.",
                                        img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                                        data: { cal: 520, protein: 45, carbs: 30 }
                                    },
                                    {
                                        title: "Lasaña de Berenjena",
                                        desc: "Queso de cabra y salsa pomodoro.",
                                        img: "https://images.unsplash.com/photo-1551183053-bf91b1d3116c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
                                        data: { cal: 410, protein: 22, carbs: 38 }
                                    }
                                ].map((dish, idx) => (
                                    <div key={idx} className="min-w-[280px] md:min-w-[320px] snap-center group cursor-pointer">
                                        <div className="h-[350px] mb-4 rounded-2xl overflow-hidden">
                                            <IngredientScanner data={dish.data}>
                                                <img
                                                    src={dish.img}
                                                    alt={dish.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </IngredientScanner>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-orange-500 transition-colors">{dish.title}</h3>
                                        <p className="text-gray-500 text-sm">{dish.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="md:hidden text-center mt-6">
                                <MagneticButton as="div" className="w-full">
                                    <Link to="/menu" className="inline-flex items-center justify-center gap-2 w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition-colors">
                                        Ver Menú Completo
                                    </Link>
                                </MagneticButton>
                            </div>
                        </div>
                    </section>
                </main>

                <Footer />
                <AISommelier />
            </div>
        </PageTransition>
    );
}
