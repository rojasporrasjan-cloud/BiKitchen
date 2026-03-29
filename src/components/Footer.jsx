import React from 'react';
import { Instagram, Facebook, Phone, Mail, MapPin, Send, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';

/**
 * Footer Component - BiKitchen Brand
 * Diseño espectacular con gradientes y efectos visuales
 */
export default function Footer() {
    const { whatsappPhone } = useWhatsApp();

    return (
        <footer className="relative w-full overflow-hidden">
            {/* Main Footer Section */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-orange-400/15 to-yellow-400/15 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
                <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>

                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[length:32px_32px]"></div>

                {/* Top Accent Bar */}
                <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 shadow-lg shadow-orange-500/50"></div>

                {/* Marquee */}
                <div className="relative w-full overflow-hidden py-5 bg-gradient-to-r from-white/5 via-white/10 to-white/5 border-b border-white/10">
                    <div className="whitespace-nowrap animate-marquee flex gap-16 text-sm font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 uppercase">
                        {[...Array(8)].map((_, i) => (
                            <span key={i} className="flex items-center gap-16">
                                <span className="flex items-center gap-2"><span className="text-xl">🍳</span> Ingredientes Frescos</span>
                                <span className="flex items-center gap-2"><span className="text-xl">🏠</span> Sabor de Casa</span>
                                <span className="flex items-center gap-2"><span className="text-xl">👨‍🍳</span> Casero</span>
                                <span className="flex items-center gap-2"><span className="text-xl">🥬</span> Natural</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="container relative z-10 pt-16 pb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

                        {/* Brand Column */}
                        <div className="lg:col-span-1">
                            <Link to="/" className="inline-block group mb-6">
                                <div className="bg-gradient-to-br from-white via-orange-50 to-white rounded-2xl p-4 shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300 border border-orange-100/20">
                                    <img
                                        src="/assets/logo.jpg"
                                        alt="BiKitchen Food"
                                        className="h-16 w-auto object-contain"
                                    />
                                </div>
                            </Link>
                            <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-xs font-medium">
                                Ingredientes frescos, sabor de casa. Comida saludable lista para disfrutar.
                            </p>
                            <div className="flex gap-3">
                                <a
                                    href="https://www.instagram.com/bikitchenfood?igsh=bnowMmp3bjZvZ2sz&utm_source=qr"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-gray-300 hover:bg-gradient-to-br hover:from-orange-500 hover:to-amber-500 hover:border-orange-400 hover:text-white transition-all duration-300 group shadow-lg hover:shadow-orange-500/50 hover:scale-110"
                                >
                                    <Instagram size={22} className="group-hover:scale-110 transition-transform" />
                                </a>
                                <a
                                    href="https://www.facebook.com/share/1AFw6FcKHd/?mibextid=wwXIfr"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-gray-300 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 hover:border-blue-400 hover:text-white transition-all duration-300 group shadow-lg hover:shadow-blue-500/50 hover:scale-110"
                                >
                                    <Facebook size={22} className="group-hover:scale-110 transition-transform" />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-3">
                                <span className="w-1 h-6 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full shadow-lg shadow-orange-500/50"></span>
                                Explorar
                            </h4>
                            <ul className="space-y-3">
                                {[
                                    { name: 'Menú Semanal', path: '/menu' },
                                    { name: 'Nuestros Packs', path: '/packs' },
                                    { name: 'Cómo Funciona', path: '/como-funciona' },
                                    { name: 'Preguntas Frecuentes', path: '/faq' }
                                ].map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            to={item.path}
                                            className="text-gray-300 hover:text-orange-400 transition-all duration-300 flex items-center gap-2 group text-sm font-medium"
                                        >
                                            <ArrowRight size={16} className="opacity-0 -ml-6 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 text-orange-400" />
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-3">
                                <span className="w-1 h-6 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full shadow-lg shadow-orange-500/50"></span>
                                Contacto
                            </h4>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3 group cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 group-hover:from-orange-500 group-hover:to-amber-500 group-hover:border-orange-400 transition-all duration-300 shadow-lg group-hover:shadow-orange-500/50">
                                        <MapPin size={18} className="text-orange-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">Alajuela</p>
                                        <p className="text-gray-500 text-xs">Costa Rica</p>
                                    </div>
                                </li>
                                <li className="group">
                                    <a href={`https://wa.me/${whatsappPhone}?text=Hola%20%F0%9F%91%8B`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 group-hover:from-green-500 group-hover:to-emerald-500 group-hover:border-green-400 transition-all duration-300 shadow-lg group-hover:shadow-green-500/50">
                                            <Phone size={18} className="text-green-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <p className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">
                                            +506 {whatsappPhone ? whatsappPhone.replace(/^506/, '').replace(/(\d{4})(\d{4})/, '$1-$2') : '8506-7200'}
                                        </p>
                                    </a>
                                </li>
                                <li className="group">
                                    <a href="mailto:bikitchenfood@gmail.com" className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:from-blue-500 group-hover:to-cyan-500 group-hover:border-blue-400 transition-all duration-300 shadow-lg group-hover:shadow-blue-500/50">
                                            <Mail size={18} className="text-blue-400 group-hover:text-white transition-colors" />
                                        </div>
                                        <p className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">bikitchenfood@gmail.com</p>
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Newsletter */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 flex items-center gap-3">
                                <span className="w-1 h-6 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full shadow-lg shadow-orange-500/50"></span>
                                Newsletter
                            </h4>
                            <p className="text-gray-300 text-sm mb-4 font-medium">Recibe menús exclusivos y consejos de nutrición.</p>
                            <form className="relative">
                                <input
                                    type="email"
                                    placeholder="Tu correo electrónico"
                                    className="w-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:bg-white/15 transition-all shadow-lg"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl flex items-center justify-center text-white transition-all shadow-lg hover:shadow-orange-500/50 hover:scale-105"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Large Brand Text */}
                <div className="w-full overflow-hidden opacity-[0.04] select-none pointer-events-none">
                    <h1 className="text-[18vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-white leading-none text-center tracking-tighter whitespace-nowrap">
                        BIKITCHEN
                    </h1>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 relative z-20 bg-black/20">
                    <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-400 text-xs flex items-center gap-1.5 font-medium">
                            © {new Date().getFullYear()} BiKitchen Food. Ingredientes frescos,
                            <Heart size={14} className="text-orange-400 fill-orange-400 animate-pulse" />
                            sabor de casa
                        </p>
                        <div className="flex flex-col items-center md:items-end gap-3 translate-y-[-2px]">
                            <div className="flex gap-6 text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                                <Link to="/privacidad" className="hover:text-orange-400 transition-colors cursor-pointer">Privacidad</Link>
                                <Link to="/terminos" className="hover:text-orange-400 transition-colors cursor-pointer">Términos</Link>
                                <Link to="/cookies" className="hover:text-orange-400 transition-colors cursor-pointer">Cookies</Link>
                                <Link to="/reembolsos" className="hover:text-orange-400 transition-colors cursor-pointer">Reembolsos</Link>
                            </div>
                            <div className="flex items-center gap-4 group transition-all duration-500">
                                <div className="flex items-center gap-3">
                                    <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/visa.svg" alt="Visa" className="h-[14px] w-auto" />
                                    <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/mastercard.svg" alt="Mastercard" className="h-[18px] w-auto" />
                                    <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/amex.svg" alt="Amex" className="h-[16px] w-auto" />
                                </div>
                                <div className="h-4 w-[1px] bg-white/20"></div>
                                <div className="flex flex-col items-start leading-tight opacity-50">
                                    <span className="text-[10px] font-black text-white/80 tracking-tighter uppercase line-through decoration-orange-500/50">BAC</span>
                                    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.1em]">Procesamiento Seguro</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
