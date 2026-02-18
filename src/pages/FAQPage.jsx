import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { usePromoBanner } from '../hooks/usePromoBanner';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import BackButton from '../components/BackButton';
import {
    Search, ChevronDown, HelpCircle, ShoppingBag, Truck, CreditCard,
    UtensilsCrossed, Clock, RefreshCw, MessageCircle, Phone, Mail,
    Sparkles, ArrowRight
} from 'lucide-react';

const FAQ_DATA = [
    {
        category: 'Pedidos',
        icon: ShoppingBag,
        color: 'orange',
        questions: [
            {
                q: '¿Cómo hago un pedido?',
                a: `Puedes hacer tu pedido directamente desde nuestra página web. Selecciona el pack o las comidas individuales que desees, agrégalas al carrito y completa el proceso de checkout. También puedes contactarnos por WhatsApp al ${whatsappPhone}.`
            },
            {
                q: '¿Cuál es el pedido mínimo?',
                a: 'No tenemos un pedido mínimo obligatorio. Sin embargo, para aprovechar mejor los costos de envío, te recomendamos nuestros packs semanales que incluyen varias comidas.'
            },
            {
                q: '¿Puedo personalizar mi pedido?',
                a: 'Sí, puedes indicarnos tus preferencias o restricciones alimentarias en las observaciones del pedido. Hacemos lo posible por adaptarnos a tus necesidades, aunque algunos cambios pueden estar sujetos a disponibilidad de ingredientes.'
            },
            {
                q: '¿Puedo cancelar o modificar mi pedido?',
                a: 'Puedes cancelar o modificar tu pedido hasta 24 horas antes de la fecha de entrega programada. Después de ese plazo, no podemos garantizar cambios ya que comenzamos la preparación.'
            },
            {
                q: '¿Cómo sé que mi pedido fue recibido?',
                a: 'Recibirás una confirmación por WhatsApp con tu número de orden. Si no recibes confirmación en las siguientes 2 horas, por favor contáctanos.'
            }
        ]
    },
    {
        category: 'Entregas',
        icon: Truck,
        color: 'blue',
        questions: [
            {
                q: '¿Cuáles son los días de entrega?',
                a: 'Realizamos entregas los días Lunes, Miércoles y Sábados. Puedes seleccionar tu día preferido al momento de hacer el pedido.'
            },
            {
                q: '¿En qué zonas entregan?',
                a: 'Actualmente entregamos en Alajuela y zonas aledañas de Costa Rica. Contáctanos para confirmar si llegamos a tu ubicación específica y conocer el costo de envío.'
            },
            {
                q: '¿Cuánto cuesta el envío?',
                a: 'El costo de envío varía según tu ubicación. Te informaremos el monto exacto antes de confirmar tu pedido. ¡Aprovecha nuestro 50% de descuento en envíos!'
            },
            {
                q: '¿En qué horario entregan?',
                a: 'Las entregas se realizan entre 8:00 AM y 6:00 PM. Coordinamos contigo un rango horario aproximado para que puedas recibir tu pedido.'
            },
            {
                q: '¿Qué pasa si no estoy para recibir el pedido?',
                a: 'Te contactaremos antes de llegar. Si no puedes recibir el pedido, podemos dejarlo con un vecino o en un lugar seguro que nos indiques. También puedes reprogramar la entrega con al menos 2 horas de anticipación.'
            }
        ]
    },
    {
        category: 'Pagos',
        icon: CreditCard,
        color: 'green',
        questions: [
            {
                q: '¿Qué métodos de pago aceptan?',
                a: 'Aceptamos SINPE Móvil, transferencia bancaria y pago en efectivo al momento de la entrega. Próximamente habilitaremos pago con tarjeta de crédito/débito.'
            },
            {
                q: '¿Cuándo debo pagar?',
                a: 'El pago debe realizarse antes de la preparación de tu pedido. Una vez confirmado el pago, comenzamos a preparar tus comidas.'
            },
            {
                q: '¿Emiten factura?',
                a: 'Sí, podemos emitir factura electrónica. Solo necesitas proporcionarnos tu cédula o número de identificación al momento del pedido.'
            },
            {
                q: '¿Tienen promociones o descuentos?',
                a: '¡Sí! Frecuentemente tenemos promociones especiales. Síguenos en Instagram @bikitchenfood para enterarte de las últimas ofertas. También puedes usar cupones de descuento en tu carrito.'
            }
        ]
    },
    {
        category: 'Comidas',
        icon: UtensilsCrossed,
        color: 'purple',
        questions: [
            {
                q: '¿Las comidas son frescas o congeladas?',
                a: 'Todas nuestras comidas se preparan frescas el mismo día o el día anterior a la entrega. No utilizamos conservantes artificiales. Algunas comidas pueden refrigerarse para mantener su frescura.'
            },
            {
                q: '¿Cuánto duran las comidas?',
                a: 'Nuestras comidas duran entre 3-5 días refrigeradas correctamente (entre 0-4°C). Te recomendamos consumirlas lo antes posible para disfrutar de su máxima frescura y sabor.'
            },
            {
                q: '¿Cómo debo calentar las comidas?',
                a: 'Puedes calentarlas en microondas (2-3 minutos) o en sartén/horno. Retira la tapa del envase antes de calentar en microondas. Cada comida incluye instrucciones específicas.'
            },
            {
                q: '¿Los envases son reciclables?',
                a: 'Sí, utilizamos envases de plástico reciclable y cartón. Te animamos a reciclarlos correctamente o reutilizarlos. Estamos trabajando en opciones más sostenibles.'
            },
            {
                q: '¿El menú cambia cada semana?',
                a: 'Sí, nuestro menú rota semanalmente para ofrecerte variedad. Publicamos el nuevo menú cada sábado en nuestra página web y redes sociales.'
            }
        ]
    },
    {
        category: 'Alergias y Dietas',
        icon: HelpCircle,
        color: 'red',
        questions: [
            {
                q: '¿Manejan opciones para alérgicos?',
                a: 'Podemos adaptar algunas comidas según tus alergias, pero es importante que nos informes con anticipación. Nuestra cocina maneja diversos ingredientes incluyendo gluten, lácteos, huevos y frutos secos.'
            },
            {
                q: '¿Tienen opciones vegetarianas o veganas?',
                a: 'Sí, ofrecemos opciones vegetarianas en nuestro menú semanal. Para opciones veganas, contáctanos directamente y haremos lo posible por adaptarnos.'
            },
            {
                q: '¿Las comidas son aptas para diabéticos?',
                a: 'Nuestras comidas son balanceadas y utilizamos ingredientes naturales. Sin embargo, te recomendamos consultar con tu médico y revisar la información nutricional de cada plato.'
            },
            {
                q: '¿Puedo solicitar comidas sin sal o bajas en sodio?',
                a: 'Sí, podemos preparar comidas con menos sal. Indícalo en las observaciones de tu pedido y lo tendremos en cuenta.'
            }
        ]
    },
    {
        category: 'Otros',
        icon: Sparkles,
        color: 'amber',
        questions: [
            {
                q: '¿Hacen catering para eventos?',
                a: '¡Sí! Ofrecemos servicios de catering para eventos corporativos, reuniones familiares y celebraciones. Contáctanos con al menos una semana de anticipación para coordinar.'
            },
            {
                q: '¿Tienen tarjetas de regalo?',
                a: 'Próximamente lanzaremos tarjetas de regalo digitales. Mientras tanto, puedes contactarnos para hacer un regalo especial a alguien.'
            },
            {
                q: '¿Cómo puedo dejar una reseña o comentario?',
                a: 'Puedes dejarnos tu opinión en Google, Instagram o enviarnos un mensaje directo. ¡Tu feedback nos ayuda a mejorar!'
            },
            {
                q: '¿Tienen programa de referidos?',
                a: 'Estamos trabajando en un programa de referidos. Pronto podrás invitar amigos y obtener beneficios. ¡Mantente atento a nuestras redes!'
            }
        ]
    }
];

const FAQItem = ({ question, answer, isOpen, onClick, color }) => {
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={onClick}
                className="w-full py-4 flex items-start justify-between gap-4 text-left group"
            >
                <span className={`font-medium text-gray-900 group-hover:text-bikitchen-orange transition-colors ${isOpen ? 'text-bikitchen-orange' : ''}`}>
                    {question}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isOpen
                        ? 'bg-bikitchen-orange text-white'
                        : 'bg-gray-100 text-gray-500'
                        }`}
                >
                    <ChevronDown size={16} />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-4 text-gray-600 text-sm leading-relaxed">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function FAQPage() {
    const showPromoBanner = usePromoBanner();
    const { getWhatsAppUrl } = useWhatsApp();
    const [selectedCategory, setSelectedCategory] = useState('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [openQuestions, setOpenQuestions] = useState({});

    const toggleQuestion = (categoryIndex, questionIndex) => {
        const key = `${categoryIndex}-${questionIndex}`;
        setOpenQuestions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const filteredFAQ = useMemo(() => {
        let data = FAQ_DATA;

        // Filtrar por categoría
        if (activeCategory !== 'all') {
            data = data.filter(cat => cat.category === activeCategory);
        }

        // Filtrar por búsqueda
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            data = data.map(category => ({
                ...category,
                questions: category.questions.filter(
                    q => q.q.toLowerCase().includes(term) || q.a.toLowerCase().includes(term)
                )
            })).filter(category => category.questions.length > 0);
        }

        return data;
    }, [searchTerm, activeCategory]);

    const totalQuestions = FAQ_DATA.reduce((sum, cat) => sum + cat.questions.length, 0);

    const getColorClasses = (color, isActive) => {
        const colors = {
            orange: isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600',
            blue: isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600',
            green: isActive ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600',
            purple: isActive ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600',
            red: isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600',
            amber: isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'
        };
        return colors[color] || colors.orange;
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <section
                    className="relative pt-28 pb-20 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 112px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-400/10 via-white/10 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    <div className="container relative z-10">
                        <BackButton className="mb-6" />

                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                            >
                                <motion.span
                                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full text-base font-bold mb-6 border border-white/30 shadow-xl"
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                >
                                    <HelpCircle size={18} />
                                    Centro de Ayuda
                                </motion.span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl"
                            >
                                Preguntas Frecuentes
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl md:text-2xl text-white/95 mb-10 font-medium leading-relaxed"
                            >
                                Encuentra respuestas a las preguntas más comunes sobre BiKitchen
                            </motion.p>

                            {/* Search Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="relative max-w-2xl mx-auto"
                            >
                                <Search size={24} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60" />
                                <input
                                    type="text"
                                    placeholder="Buscar preguntas..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-16 pr-6 py-5 bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-3xl shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white text-white placeholder-white/70 text-lg font-medium"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                                    >
                                        ✕
                                    </button>
                                )}
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-base text-white/80 mt-6 font-medium"
                            >
                                {totalQuestions} preguntas en {FAQ_DATA.length} categorías
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Categories Filter */}
                <section className="py-8 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-lg z-30 shadow-lg">
                    <div className="container">
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setActiveCategory('all')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-black whitespace-nowrap transition-all shadow-lg ${activeCategory === 'all'
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30 scale-105'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                                    }`}
                            >
                                <Sparkles size={18} />
                                Todas
                            </button>
                            {FAQ_DATA.map((category) => (
                                <button
                                    key={category.category}
                                    onClick={() => setActiveCategory(category.category)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-black whitespace-nowrap transition-all shadow-lg ${activeCategory === category.category
                                        ? getColorClasses(category.color, true) + ' scale-105'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                                        }`}
                                >
                                    <category.icon size={18} />
                                    {category.category}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Content */}
                <section className="py-12">
                    <div className="container">
                        {filteredFAQ.length === 0 ? (
                            <div className="text-center py-16">
                                <HelpCircle size={64} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    No encontramos resultados
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    Intenta con otros términos de búsqueda
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setActiveCategory('all');
                                    }}
                                    className="text-bikitchen-orange font-medium hover:underline"
                                >
                                    Ver todas las preguntas
                                </button>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto space-y-8">
                                {filteredFAQ.map((category, catIndex) => (
                                    <motion.div
                                        key={category.category}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: catIndex * 0.1 }}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
                                    >
                                        {/* Category Header */}
                                        <div className={`px-6 py-4 flex items-center gap-3 border-b border-gray-100 ${category.color === 'orange' ? 'bg-orange-50' :
                                            category.color === 'blue' ? 'bg-blue-50' :
                                                category.color === 'green' ? 'bg-green-50' :
                                                    category.color === 'purple' ? 'bg-purple-50' :
                                                        category.color === 'red' ? 'bg-red-50' :
                                                            'bg-amber-50'
                                            }`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getColorClasses(category.color, false)}`}>
                                                <category.icon size={20} />
                                            </div>
                                            <div>
                                                <h2 className="font-bold text-gray-900">
                                                    {category.category}
                                                </h2>
                                                <p className="text-sm text-gray-500">
                                                    {category.questions.length} preguntas
                                                </p>
                                            </div>
                                        </div>

                                        {/* Questions */}
                                        <div className="px-6">
                                            {category.questions.map((item, qIndex) => (
                                                <FAQItem
                                                    key={qIndex}
                                                    question={item.q}
                                                    answer={item.a}
                                                    isOpen={openQuestions[`${catIndex}-${qIndex}`]}
                                                    onClick={() => toggleQuestion(catIndex, qIndex)}
                                                    color={category.color}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="py-16 bg-gradient-to-r from-bikitchen-orange to-orange-500">
                    <div className="container">
                        <div className="max-w-3xl mx-auto text-center text-white">
                            <MessageCircle size={48} className="mx-auto mb-6 opacity-80" />
                            <h2 className="text-3xl font-bold mb-4">
                                ¿No encontraste lo que buscabas?
                            </h2>
                            <p className="text-white/80 mb-8">
                                Nuestro equipo está listo para ayudarte con cualquier duda
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href={getWhatsAppUrl('Hola 👋')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-white text-bikitchen-orange px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    <Phone size={20} />
                                    WhatsApp
                                </a>
                                <a
                                    href="mailto:bikitchenfood@gmail.com"
                                    className="inline-flex items-center justify-center gap-2 bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors border border-white/30"
                                >
                                    <Mail size={20} />
                                    Email
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Links */}
                <section className="py-12 bg-gray-50">
                    <div className="container">
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                                Enlaces útiles
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Link
                                    to="/como-funciona"
                                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-bikitchen-orange:border-bikitchen-orange transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Clock size={20} className="text-bikitchen-orange" />
                                        <span className="font-medium text-gray-900">Cómo Funciona</span>
                                    </div>
                                    <ArrowRight size={18} className="text-gray-400 group-hover:text-bikitchen-orange transition-colors" />
                                </Link>
                                <Link
                                    to="/packs"
                                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-bikitchen-orange:border-bikitchen-orange transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag size={20} className="text-bikitchen-orange" />
                                        <span className="font-medium text-gray-900">Ver Packs</span>
                                    </div>
                                    <ArrowRight size={18} className="text-gray-400 group-hover:text-bikitchen-orange transition-colors" />
                                </Link>
                                <Link
                                    to="/terminos"
                                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-bikitchen-orange:border-bikitchen-orange transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <RefreshCw size={20} className="text-bikitchen-orange" />
                                        <span className="font-medium text-gray-900">Términos</span>
                                    </div>
                                    <ArrowRight size={18} className="text-gray-400 group-hover:text-bikitchen-orange transition-colors" />
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
