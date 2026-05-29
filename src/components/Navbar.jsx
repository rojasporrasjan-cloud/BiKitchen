import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, ChefHat, Utensils, Gift, HelpCircle, User, Soup, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useChristmas } from '../context/ChristmasContext';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';
import { useUI } from '../context/UIContext';
import NotificationInbox from './NotificationInbox';

export default function Navbar({ forceSolid = false }) {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useUI();
    const [scrolled, setScrolled] = useState(false);
    const [promoBannerVisible, setPromoBannerVisible] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const location = useLocation();
    const { cart = [], getTotalItems, setIsCartOpen } = useCart() || {};
    const { currentUser, isAdmin } = useAuth() || {};

    const isOpen = isMobileMenuOpen;
    const setIsOpen = setIsMobileMenuOpen;

    useEffect(() => {
        const handleBannerChange = (e) => setPromoBannerVisible(e.detail?.visible ?? false);
        window.addEventListener('promoBannerChange', handleBannerChange);
        return () => window.removeEventListener('promoBannerChange', handleBannerChange);
    }, []);

    useEffect(() => {
        const checkScroll = () => {
            const currentY = window.scrollY || document.documentElement.scrollTop || 0;
            setScrolled(currentY > 15);
        };
        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
        return () => {
            window.removeEventListener('scroll', checkScroll);
        };
    }, []);

    const navLinks = [
        { name: 'Planes Semanales', path: '/packs', icon: Utensils },
        { name: 'Platos Individuales', path: '/individuales', icon: Soup },
        { name: 'Promociones', path: '/promociones', icon: Gift, highlight: true },
        { name: 'Cómo Comprar', path: '/como-funciona', icon: HelpCircle }
    ];

    const isActive = (path) => location.pathname === path;
    const isLandingPage = location.pathname === '/' || location.pathname === '/home';
    const shouldBeTransparent = isLandingPage && !scrolled && !forceSolid;

    if (location.pathname === '/mi-cuenta') return null;

    return (
        <div style={{ pointerEvents: 'none' }}>
            {/* Skip-to-content — accesibilidad / lectores de pantalla */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-bikitchen-orange focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
                style={{ pointerEvents: 'auto' }}
            >
                Saltar al contenido principal
            </a>
            <nav
                style={{
                    backgroundColor: shouldBeTransparent ? 'transparent' : '#FFFFFF',
                    borderBottom: shouldBeTransparent ? '1px solid transparent' : '1px solid rgba(0,0,0,0.05)',
                    boxShadow: shouldBeTransparent ? 'none' : '0 10px 40px rgba(0,0,0,0.08)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    top: promoBannerVisible ? 'var(--promo-banner-height, 0px)' : '0',
                    pointerEvents: 'auto'
                }}
                className="fixed left-0 right-0 z-[100] py-2 md:py-3"
            >
                <div className="container mx-auto px-4 flex items-center justify-between">
                    {/* Logo Section */}
                    <Link to="/" className="group flex-shrink-0">
                        <div className={`rounded-2xl p-1.5 md:p-2 transition-all duration-500 hover:scale-105 active:scale-95 ${shouldBeTransparent
                            ? 'bg-white/25 shadow-lg border border-white/30'
                            : 'bg-white shadow-lg border border-gray-100'
                            }`}>
                            <img src="/assets/logo.png" alt="BiKitchen Food" className="h-12 md:h-14 w-auto object-contain" />
                        </div>
                    </Link>

                    {/* Nav Links - Center (Desktop) */}
                    <div className="hidden md:flex items-center gap-2">
                        {navLinks.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${shouldBeTransparent
                                        ? active ? 'bg-white/20 text-white shadow-lg scale-105' : 'text-white/90 hover:bg-white/10'
                                        : active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/25 scale-105' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon size={18} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Actions Area */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            aria-label="Buscar"
                            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all border ${shouldBeTransparent ? 'bg-white/20 text-white border-white/30' : 'bg-gray-100 text-gray-600 border-gray-200/50'}`}
                        >
                            <Search size={18} aria-hidden="true" />
                        </button>

                        {/* Admin Button (Only for admins) */}
                        {isAdmin && isAdmin() && (
                            <Link 
                                to="/admin" 
                                className={`hidden sm:flex items-center justify-center gap-2 px-3 h-10 rounded-xl transition-all border ${shouldBeTransparent ? 'bg-orange-500/20 text-white border-white/30' : 'bg-gray-800 text-white border-gray-900 shadow-md'} hover:scale-105 active:scale-95`}
                            >
                                <ChefHat size={18} className="text-orange-400" />
                                <span className="text-xs font-bold">Admin</span>
                            </Link>
                        )}

                        {/* Notification Inbox — solo clientes logueados */}
                        {currentUser && !isAdmin?.() && (
                            <div className="hidden sm:flex">
                                <NotificationInbox transparent={shouldBeTransparent} />
                            </div>
                        )}

                        {/* Account */}
                        <Link
                            to="/mi-cuenta"
                            aria-label="Mi cuenta"
                            className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-xl transition-all border ${shouldBeTransparent ? 'bg-white/20 text-white border-white/30' : 'bg-gray-50 text-gray-600 border-gray-100'}`}
                        >
                            <User size={18} aria-hidden="true" />
                        </Link>

                        {/* Cart */}
                        <button
                            onClick={() => setIsCartOpen && setIsCartOpen(true)}
                            aria-label="Ver carrito de compras"
                            className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all border ${shouldBeTransparent
                                ? 'bg-white/25 text-white border-white/30'
                                : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                }`}
                        >
                            <ShoppingCart size={20} strokeWidth={2.5} aria-hidden="true" />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">{cart.length}</span>
                            )}
                        </button>

                        {/* Mobile Toggle */}
                        <button
                            className={`md:hidden p-2.5 rounded-xl border ${shouldBeTransparent ? 'text-white bg-white/20 border-white/30' : 'text-gray-800 bg-white border-gray-100'}`}
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
                        </button>
                    </div>
                </div>
            </nav>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[110] md:hidden pointer-events-auto"
                        onClick={() => setIsOpen(false)}
                    >
                        {/* Background - non-interactive */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-400 pointer-events-none"></div>

                        {/* Close button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            aria-label="Cerrar menú"
                            className="absolute top-6 right-6 text-white p-3 z-20"
                        >
                            <X size={32} />
                        </button>

                        {/* Content - interactive */}
                        <div
                            className="relative h-full flex flex-col justify-center items-center px-8 gap-6 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src="/assets/logo.png" className="h-16 w-auto bg-white p-4 rounded-3xl" alt="Logo" />
                            <div className="flex flex-col gap-4 w-full max-w-xs">
                                {navLinks.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className="bg-white/20 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-white/30 active:scale-95 pointer-events-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsOpen(false);
                                            }}
                                        >
                                            <Icon size={22} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </div>
    );
}
