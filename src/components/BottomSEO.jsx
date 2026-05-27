import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Cookie, RefreshCw, Star, MapPin, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * BottomSEO Component
 * Sección final diseñada para mejorar el SEO y dar acceso prominente a políticas legales.
 * Ubicada justo antes del Footer.
 */
export default function BottomSEO() {
    const legalLinks = [
        { 
            name: 'Privacidad', 
            path: '/privacidad', 
            icon: Shield, 
            desc: 'Cómo protegemos tus datos personales.' 
        },
        { 
            name: 'Términos', 
            path: '/terminos', 
            icon: FileText, 
            desc: 'Condiciones de uso de nuestro servicio.' 
        },
        { 
            name: 'Cookies', 
            path: '/cookies', 
            icon: Cookie, 
            desc: 'Uso de tecnologías de seguimiento.' 
        },
        { 
            name: 'Reembolsos', 
            path: '/reembolsos', 
            icon: RefreshCw, 
            desc: 'Políticas de cambios y devoluciones.' 
        }
    ];

    const keywords = [
        "Comida Saludable Alajuela",
        "Meal Prep Costa Rica",
        "Planes de Alimentación Semanal",
        "Comida Casera a Domicilio",
        "Nutrición y Bienestar",
        "Ingredientes Frescos y Locales"
    ];

    return (
        <section className="py-20 bg-gradient-to-b from-white to-bikitchen-beige/30 border-t border-gray-100 overflow-hidden">
            <div className="container px-4 md:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    
                    {/* SEO Text Block */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-bikitchen-orange rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                            <Star size={14} className="fill-current" />
                            Calidad BiKitchen
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">
                            Comida saludable con sabor de casa en <span className="text-bikitchen-orange">Costa Rica</span>.
                        </h2>
                        <div className="prose prose-orange text-gray-600 max-w-xl">
                            <p className="mb-4 leading-relaxed">
                                En <strong>BiKitchen Food</strong>, nos apasiona transformar tu alimentación diaria. 
                                Ubicados en <strong>Alajuela</strong>, preparamos cada plato con ingredientes 
                                frescos y técnicas de cocina tradicional para garantizar ese sabor casero que tanto te gusta.
                            </p>
                            <p className="leading-relaxed">
                                Nuestro servicio de <strong>Meal Prep</strong> y planes semanales está diseñado 
                                para quienes buscan ahorrar tiempo sin sacrificar su salud. Somos la solución ideal 
                                para una alimentación balanceada, deliciosa y lista para disfrutar en cualquier 
                                parte de la Gran Área Metropolitana.
                            </p>
                        </div>
                        
                        {/* SEO Keywords Tag Cloud (Discreta) */}
                        <div className="flex flex-wrap gap-2 mt-8">
                            {keywords.map((kw, i) => (
                                <span key={i} className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md">
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Legal Links Tiles */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {legalLinks.map((link, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                            >
                                <Link 
                                    to={link.path}
                                    className="group block p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-bikitchen-orange/20 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-125 transition-transform duration-500 text-bikitchen-orange">
                                        <link.icon size={20} />
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-bikitchen-orange mb-4 group-hover:bg-bikitchen-orange group-hover:text-white transition-colors duration-300">
                                        <link.icon size={20} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2 group-hover:text-bikitchen-orange transition-colors">
                                        {link.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {link.desc}
                                    </p>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Bottom Spacer / Small Quote */}
                <div className="mt-20 pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin size={16} />
                        <span>Sede Central: Alajuela, Costa Rica</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Heart size={16} className="text-red-400" />
                        <span>Pasión por la nutrición real</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
