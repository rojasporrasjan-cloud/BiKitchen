import React from 'react';
import { Instagram, Facebook, Phone, Mail, MapPin, Send, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Footer Component - BiKitchen Brand
 * Diseño espectacular con gradientes y efectos visuales
 */
export default function Footer() {
    return (
        <footer className="relative w-full overflow-hidden">
            {/* Main Footer Section */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
                
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[length:32px_32px]"></div>

                {/* Top Accent Bar */}
                <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600"></div>

                {/* Marquee */}
                <div className="relative w-full overflow-hidden py-4 bg-white/5 border-b border-white/10">
                    <div className="whitespace-nowrap animate-marquee flex gap-12 text-xs font-bold tracking-[0.4em] text-orange-400/80 uppercase">
                        {[...Array(8)].map((_, i) => (
                            <span key={i} className="flex items-center gap-12">
                                <span>🍳 Fresh</span>
                                <span>🥗 Local</span>
                                <span>👨‍🍳 Gourmet</span>
                                <span>🌿 Organic</span>
                                <span>♻️ Sustainable</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="container relative z-10 pt-16 pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

                        {/* Brand Column */}
                        <div className="lg:col-span-1">
                            <Link to="/" className="inline-block group mb-6">
                                <div className="bg-white rounded-2xl p-3 shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300">
                                    <img
                                        src="/assets/logo.jpg"
                                        alt="BiKitchen Food"
                                        className="h-14 w-auto object-contain"
                                    />
                                </div>
                            </Link>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
                                Comida saludable preparada con amor. Ingredientes frescos, locales y de temporada para tu bienestar.
                            </p>
                            <div className="flex gap-3">
                                <a href="#" className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:border-orange-500 hover:text-white transition-all duration-300 group">
                                    <Instagram size={20} className="group-hover:scale-110 transition-transform" />
                                </a>
                                <a href="#" className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:border-orange-500 hover:text-white transition-all duration-300 group">
                                    <Facebook size={20} className="group-hover:scale-110 transition-transform" />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                                <span className="w-8 h-0.5 bg-orange-500 rounded-full"></span>
                                Explorar
                            </h4>
                            <ul className="space-y-3">
                                {[
                                    { name: 'Menú Semanal', path: '/menu' },
                                    { name: 'Nuestros Packs', path: '/packs' },
                                    { name: 'Nuestra Filosofía', path: '#nosotros' },
                                    { name: 'Regalar BiKitchen', path: '#' }
                                ].map((item) => (
                                    <li key={item.name}>
                                        <Link 
                                            to={item.path} 
                                            className="text-gray-400 hover:text-orange-400 transition-all duration-300 flex items-center gap-2 group text-sm"
                                        >
                                            <ArrowRight size={14} className="opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                                <span className="w-8 h-0.5 bg-orange-500 rounded-full"></span>
                                Contacto
                            </h4>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3 group cursor-pointer">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 transition-colors">
                                        <MapPin size={16} className="text-orange-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm group-hover:text-white transition-colors">Escazú, San José</p>
                                        <p className="text-gray-500 text-xs">Costa Rica</p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 group cursor-pointer">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 transition-colors">
                                        <Phone size={16} className="text-orange-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <p className="text-gray-400 text-sm group-hover:text-white transition-colors">+506 8888-8888</p>
                                </li>
                                <li className="flex items-center gap-3 group cursor-pointer">
                                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 transition-colors">
                                        <Mail size={16} className="text-orange-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <p className="text-gray-400 text-sm group-hover:text-white transition-colors">hola@bikitchen.com</p>
                                </li>
                            </ul>
                        </div>

                        {/* Newsletter */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                                <span className="w-8 h-0.5 bg-orange-500 rounded-full"></span>
                                Newsletter
                            </h4>
                            <p className="text-gray-400 text-sm mb-4">Recibe menús exclusivos y consejos de nutrición.</p>
                            <form className="relative">
                                <input
                                    type="email"
                                    placeholder="Tu correo electrónico"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:bg-white/10 transition-all"
                                />
                                <button 
                                    type="submit" 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center justify-center text-white transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Large Brand Text */}
                <div className="w-full overflow-hidden opacity-[0.03] select-none pointer-events-none">
                    <h1 className="text-[18vw] font-black text-white leading-none text-center tracking-tighter whitespace-nowrap">
                        BIKITCHEN
                    </h1>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10">
                    <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                            © {new Date().getFullYear()} BiKitchen Food. Hecho con 
                            <Heart size={12} className="text-orange-500 fill-orange-500" /> 
                            en Costa Rica
                        </p>
                        <div className="flex gap-6 text-xs text-gray-500">
                            <a href="#" className="hover:text-orange-400 transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-orange-400 transition-colors">Términos</a>
                            <a href="#" className="hover:text-orange-400 transition-colors">Cookies</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
