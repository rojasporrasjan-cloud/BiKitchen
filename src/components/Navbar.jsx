import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChefHat, Utensils, Gift, Snowflake, HelpCircle, User, Soup, Search, Ticket, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useChristmas } from '../context/ChristmasContext';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import { useUI } from '../context/UIContext';

/**
 * Navbar Component - BiKitchen Brand
 * Diseño profesional con navegación clara y colores naranja
 */
export default function Navbar() {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useUI();
    const [isOpen, setIsOpen] = [isMobileMenuOpen, setIsMobileMenuOpen];
    const [scrolled, setScrolled] = useState(false);
    const [visible, setVisible] = useState(true);
    const [promoBannerVisible, setPromoBannerVisible] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const location = useLocation();
    const { cart = [], getTotalItems, setIsCartOpen } = useCart() || {};
    const { currentUser, isAdmin, logout } = useAuth() || {};
    const { isChristmasMode } = useChristmas() || {};

    // Escuchar si hay un banner promocional activo
    useEffect(() => {
        // Escuchar evento personalizado del PromoBanner
        const handleBannerChange = (e) => {
            setPromoBannerVisible(e.detail?.visible ?? false);
        };

        window.addEventListener('promoBannerChange', handleBannerChange);

        // Verificar si ya hay un banner visible (por si el evento ya se emitió)
        const checkExistingBanner = () => {
            const banner = document.querySelector('[data-promo-banner]');
            if (banner) {
                setPromoBannerVisible(true);
            }
        };

        // Pequeño delay para dar tiempo al PromoBanner de montarse
        setTimeout(checkExistingBanner, 100);

        return () => {
            window.removeEventListener('promoBannerChange', handleBannerChange);
        };
    }, []);

    // El banner se muestra solo si el PromoBanner emite que está visible
    const showBanner = promoBannerVisible;

    const cartCount = typeof getTotalItems === 'function'
        ? getTotalItems()
        : (Array.isArray(cart) ? cart.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0);

    /**
     * ========================================
     * SISTEMA DE OCULTAMIENTO DEL NAVBAR AL SCROLL
     * ========================================
     * 
     * Este sistema controla la visibilidad del navbar basándose en la posición del scroll.
     * Funciona con múltiples métodos de scroll: rueda del mouse, scrollbar, y touch.
     * 
     * COMPORTAMIENTO:
     * - Se ESCONDE cuando: scroll > 250px (scrollbar) o virtualScrollY > 300 (wheel/touch)
     * - Se MUESTRA cuando: scroll < 150px (scrollbar) o virtualScrollY < 200 (wheel/touch)
     * - Se RESETEA cuando: cambia la ruta (location.pathname)
     * 
     * MÉTODOS DE DETECCIÓN:
     * 1. requestAnimationFrame polling: Detecta scroll via scrollbar (arrastrar)
     * 2. wheel event: Detecta scroll con rueda del mouse
     * 3. touch events: Detecta scroll en dispositivos móviles
     * 
     * EVENTO CUSTOM:
     * - Emite 'navbarVisibilityChange' para sincronizar banners (ChristmasBanner, PromocionBanner)
     * 
     * ⚠️ NO MODIFICAR SIN PROBAR TODOS LOS MÉTODOS DE SCROLL ⚠️
     */
    const virtualScrollY = useRef(0);

    // Emitir evento custom cuando cambia la visibilidad del navbar
    // Otros componentes (banners) escuchan este evento para sincronizarse
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('navbarVisibilityChange', {
            detail: { visible }
        }));
    }, [visible]);

    useEffect(() => {
        /**
         * MÉTODO 1: Polling con requestAnimationFrame
         * Detecta scroll cuando el usuario arrastra la scrollbar con el mouse.
         * Verifica la posición real del scroll en múltiples elementos.
         */
        let lastCheck = 0;
        let rafId = null;

        const checkScrollPosition = () => {
            // Buscar scroll en todos los posibles contenedores
            const scrollables = [
                document.documentElement,
                document.body,
                document.querySelector('main'),
                document.querySelector('[class*="overflow"]'),
            ].filter(Boolean);

            let maxScroll = 0;
            scrollables.forEach(el => {
                if (el.scrollTop > maxScroll) maxScroll = el.scrollTop;
            });

            // También verificar window.pageYOffset
            const windowScroll = window.pageYOffset || 0;
            if (windowScroll > maxScroll) maxScroll = windowScroll;

            // Solo actualizar si hay cambio significativo (evita renders innecesarios)
            if (Math.abs(maxScroll - lastCheck) > 50) {
                virtualScrollY.current = maxScroll;

                // Umbrales para mostrar/ocultar
                if (maxScroll < 150) {
                    setVisible(true);
                } else if (maxScroll > 250) {
                    setVisible(false);
                }

                setScrolled(maxScroll > 100);
                lastCheck = maxScroll;
            }

            rafId = requestAnimationFrame(checkScrollPosition);
        };

        rafId = requestAnimationFrame(checkScrollPosition);

        /**
         * MÉTODO 2: Wheel Event
         * Detecta scroll con la rueda del mouse.
         * Usa virtualScrollY para tracking más preciso.
         */
        const handleWheel = (e) => {
            if (e.deltaY > 0) {
                // Scroll hacia abajo
                virtualScrollY.current += e.deltaY;
                if (virtualScrollY.current > 300) {
                    setVisible(false);
                }
            } else if (e.deltaY < 0) {
                // Scroll hacia arriba
                virtualScrollY.current += e.deltaY;
                if (virtualScrollY.current < 0) virtualScrollY.current = 0;
                if (virtualScrollY.current < 200) {
                    setVisible(true);
                }
            }

            setScrolled(virtualScrollY.current > 100);
        };

        window.addEventListener('wheel', handleWheel, { passive: true });

        /**
         * MÉTODO 3: Touch Events
         * Detecta scroll en dispositivos móviles.
         */
        let lastTouchY = 0;

        const handleTouchStart = (e) => {
            lastTouchY = e.touches[0].clientY;
        };

        const handleTouchMove = (e) => {
            const touchY = e.touches[0].clientY;
            const diff = lastTouchY - touchY; // positivo = scroll down

            if (diff > 0) {
                virtualScrollY.current += diff;
                if (virtualScrollY.current > 300) {
                    setVisible(false);
                }
            } else if (diff < 0) {
                virtualScrollY.current += diff;
                if (virtualScrollY.current < 0) virtualScrollY.current = 0;
                if (virtualScrollY.current < 200) {
                    setVisible(true);
                }
            }

            setScrolled(virtualScrollY.current > 100);
            lastTouchY = touchY;
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: true });

        // Cleanup: cancelar RAF y remover event listeners
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    // Cerrar menú móvil y resetear scroll al cambiar de ruta
    useEffect(() => {
        setIsOpen(false);
        virtualScrollY.current = 0;
        setVisible(true);
        setScrolled(false);
    }, [location.pathname]);

    // Atajo de teclado Ctrl+K para búsqueda
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Nueva estructura de navegación - 5 ítems principales
    const navLinks = [
        { name: 'Planes Semanales', path: '/packs', icon: Utensils },
        { name: 'Platos Individuales', path: '/individuales', icon: Soup },
        { name: 'Promociones', path: '/promociones', icon: Gift, highlight: true },
        { name: 'Cómo Funciona', path: '/como-funciona', icon: HelpCircle }
    ];

    const isActive = (path) => location.pathname === path;

    // No mostrar navbar en la página de Mi Cuenta
    if (location.pathname === '/mi-cuenta') {
        return null;
    }

    return (
        <>
            <nav
                style={{
                    transform: visible ? 'translateY(0)' : 'translateY(-100%)',
                    top: visible && showBanner ? 'var(--promo-banner-height, 0px)' : '0'
                }}
                className={`fixed left-0 right-0 z-50 bg-white/70 backdrop-blur-2xl border-b transition-all duration-500 ease-in-out ${scrolled
                        ? 'shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-gray-100/50 py-2'
                        : 'shadow-none border-transparent py-4'
                    }`}
            >
                {/* Desktop: Logo izquierda + Nav centro + Acciones derecha */}
                <div className="container hidden md:flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="group flex-shrink-0">
                        <div className={`rounded-2xl p-2 transition-all duration-500 hover:scale-105 active:scale-95 ${scrolled
                                ? 'bg-white shadow-lg border border-gray-100'
                                : 'bg-white shadow-2xl shadow-orange-500/10 border border-orange-100/30'
                            }`}>
                            <img
                                src="/assets/logo.jpg"
                                alt="BiKitchen Food"
                                className="h-10 md:h-12 w-auto object-contain"
                            />
                        </div>
                    </Link>

                    {/* Nav Links - Centro */}
                    <div className="flex items-center gap-1.5 lg:gap-2">
                        {navLinks.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-bold transition-all duration-500 ${active
                                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/25 scale-105'
                                            : item.highlight
                                                ? 'text-orange-500 hover:bg-orange-50 hover:scale-105'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-105'
                                        }`}
                                >
                                    <Icon size={18} className={`transition-transform duration-300 ${active ? 'text-white scale-110' : item.highlight ? 'text-orange-500 group-hover:scale-110' : 'text-bikitchen-orange group-hover:scale-110'
                                        }`} />
                                    <span className="hidden lg:inline">{item.name}</span>
                                    <span className="lg:hidden">{item.name.split(' ')[0]}</span>
                                    {item.highlight && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse shadow-lg"></span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Acciones - Derecha */}
                    <div className="flex items-center gap-2">
                        {/* Search Button */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 hover:from-orange-50 hover:to-amber-50 text-gray-600 hover:text-bikitchen-orange transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 border border-gray-200/50 hover:border-orange-200"
                            title="Buscar (Ctrl+K)"
                        >
                            <Search size={18} />
                        </button>

                        {/* Admin Button - Solo visible para admins */}
                        {currentUser && isAdmin && isAdmin() && (
                            <Link
                                to="/admin"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-xs bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 hover:from-purple-500 hover:to-indigo-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105 border border-gray-200/50 hover:border-purple-300"
                            >
                                <ChefHat size={16} />
                                <span className="hidden lg:inline">Admin</span>
                            </Link>
                        )}

                        {/* Mi Cuenta Button */}
                        <Link
                            to="/mi-cuenta"
                            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-50 text-gray-600 hover:bg-orange-500 hover:text-white transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-orange-500/20 hover:scale-110 border border-gray-100 group"
                            title="Mi Cuenta"
                        >
                            <User size={20} className="group-hover:scale-110 transition-transform" />
                        </Link>

                        {/* Mis Cupones Button (Desktop) */}
                        {currentUser && (
                            <Link
                                to="/mis-cupones"
                                className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 text-bikitchen-orange hover:bg-orange-500 hover:text-white transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 border border-orange-100 hover:border-orange-300"
                                title="Mis Cupones"
                            >
                                <Ticket size={18} />
                            </Link>
                        )}

                        {/* Cart Button */}
                        <button
                            onClick={() => setIsCartOpen && setIsCartOpen(true)}
                            className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white hover:shadow-xl hover:shadow-orange-500/40 hover:scale-110 transition-all duration-300 border border-orange-400/50"
                        >
                            <ShoppingCart size={20} strokeWidth={2.5} />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] flex items-center justify-center bg-gradient-to-r from-red-500 to-rose-500 text-white text-[11px] font-bold rounded-full border-2 border-white shadow-lg animate-pulse">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile: Simple flex layout */}
                <div className="container flex md:hidden items-center justify-between">
                    {/* Mobile Toggle */}
                    <button
                        className="p-2.5 rounded-xl text-gray-800 bg-white/50 hover:bg-white hover:text-orange-600 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-100/50 active:scale-90"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        <Menu size={24} strokeWidth={2.5} />
                    </button>

                    {/* Mobile Logo */}
                    <Link to="/" className="absolute left-1/2 -translate-x-1/2">
                        <div className="rounded-xl p-1.5 bg-white shadow-xl shadow-orange-500/10 border border-orange-100/30 active:scale-95 transition-transform">
                            <img
                                src="/assets/logo.jpg"
                                alt="BiKitchen Food"
                                className="h-8 w-auto object-contain"
                            />
                        </div>
                    </Link>

                    {/* Mobile Cart */}
                    <button
                        onClick={() => setIsCartOpen && setIsCartOpen(true)}
                        className="relative p-2.5 rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 active:scale-90 transition-all duration-300"
                    >
                        <ShoppingCart size={22} strokeWidth={2.5} />
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-lg">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay - Turquesa + Naranja */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] md:hidden"
                    >
                        {/* Background with gradient turquesa + naranja */}
                        <div className="absolute inset-0 bg-gradient-to-br from-bikitchen-orange via-orange-500 to-bikitchen-orange-dark"></div>

                        {/* Decorative circles */}
                        <div className="absolute top-20 -left-20 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-bikitchen-gold/20 rounded-full blur-3xl"></div>

                        {/* Pattern overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[length:24px_24px]"></div>

                        {/* Close button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-2xl z-10"
                        >
                            <X size={32} strokeWidth={2} />
                        </button>

                        {/* Content */}
                        <div className="relative h-full flex flex-col justify-center items-center px-8">
                            {/* Logo */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="mb-10"
                            >
                                <div className="bg-white rounded-3xl p-4 shadow-2xl">
                                    <img
                                        src="/assets/logo.jpg"
                                        alt="BiKitchen"
                                        className="h-14 w-auto"
                                    />
                                </div>
                            </motion.div>

                            {/* Navigation Links - Simplified for Mobile to avoid redundancy with BottomNav */}
                            <div className="flex flex-col gap-4 text-center w-full max-w-xs">
                                {[
                                    { name: 'Promociones', path: '/promociones', icon: Gift },
                                    { name: 'Cómo Funciona', path: '/como-funciona', icon: HelpCircle },
                                    { name: 'Sobre Nosotros', path: '/nosotros', icon: Info },
                                    { name: 'Preguntas Frecuentes', path: '/faq', icon: HelpCircle }
                                ].map((item, idx) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.path);
                                    return (
                                        <motion.div
                                            key={item.name}
                                            initial={{ x: -50, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.15 + idx * 0.1 }}
                                        >
                                            <Link
                                                to={item.path}
                                                onClick={() => setIsOpen(false)}
                                                className={`flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${active
                                                        ? 'bg-white text-bikitchen-orange shadow-lg'
                                                        : 'bg-white/10 text-white hover:bg-white/20'
                                                    }`}
                                            >
                                                <Icon size={22} />
                                                {item.name}
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>

                             {/* Divider */}
                            <div className="w-24 h-1 bg-white/30 mx-auto mt-8 mb-6 rounded-full"></div>

                            {/* CTA Buttons - Simplified for Mobile */}
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col gap-3 w-full max-w-xs"
                            >
                                {/* Botón de Búsqueda en móvil ya que no está en BottomNav */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsSearchOpen(true);
                                    }}
                                    className="flex items-center justify-center gap-3 bg-white/20 text-white font-bold px-8 py-4 rounded-2xl shadow-lg border border-white/30 transition-all active:scale-95"
                                >
                                    <Search size={22} />
                                    <span>Buscar Platos</span>
                                </button>

                                {/* Admin Button - Solo visible para admins */}
                                {currentUser && isAdmin && isAdmin() && (
                                    <Link
                                        to="/admin"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-3 bg-white/10 text-white font-semibold px-8 py-3 rounded-2xl hover:bg-white/20 transition-all duration-300"
                                    >
                                        <ChefHat size={20} />
                                        <span>Panel Admin</span>
                                    </Link>
                                )}

                                {/* Mis Cupones Mobile */}
                                {currentUser && (
                                    <Link
                                        to="/mis-cupones"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center justify-center gap-3 bg-white/10 text-white/80 font-medium px-8 py-3 rounded-2xl hover:bg-white/20 transition-all duration-300"
                                    >
                                        <Ticket size={24} className="text-amber-200" />
                                        <span>Mis Cupones</span>
                                    </Link>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Search Modal */}
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
}
