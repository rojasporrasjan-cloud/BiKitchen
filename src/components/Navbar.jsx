import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Menu, X, ChefHat } from 'lucide-react';

/**
 * Navbar Component - BiKitchen Brand
 * Diseño espectacular con gradientes y animaciones fluidas
 */
export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Inicio', path: '/' },
        { name: 'Individuales', path: '/individuales' },
        { name: 'Packs', path: '/packs' },
        { name: 'Nosotros', path: '#nosotros' }
    ];

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
                    scrolled
                        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg py-2'
                        : 'bg-gradient-to-b from-black/20 to-transparent py-4'
                }`}
            >
                <div className="container flex items-center justify-between relative">
                    {/* Mobile Toggle */}
                    <button
                        className={`md:hidden p-2 rounded-xl transition-all ${
                            scrolled 
                                ? 'text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800' 
                                : 'text-white hover:bg-white/20'
                        }`}
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        <Menu size={26} strokeWidth={2} />
                    </button>

                    {/* Left Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.slice(0, 2).map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`group relative text-sm font-bold tracking-wider uppercase transition-all duration-300 ${
                                    scrolled 
                                        ? 'text-gray-700 dark:text-gray-200 hover:text-orange-500' 
                                        : 'text-white/90 hover:text-white'
                                }`}
                            >
                                {item.name}
                                <span className={`absolute -bottom-1 left-0 w-0 h-0.5 rounded-full transition-all duration-300 group-hover:w-full ${
                                    scrolled ? 'bg-orange-500' : 'bg-white'
                                }`}></span>
                            </Link>
                        ))}
                    </div>

                    {/* Centered Logo */}
                    <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group z-10">
                        <div className={`rounded-2xl p-2 transition-all duration-300 ${
                            scrolled 
                                ? 'bg-white shadow-lg group-hover:shadow-xl' 
                                : 'bg-white/95 shadow-xl group-hover:shadow-2xl'
                        }`}>
                            <img
                                src="/assets/logo.jpg"
                                alt="BiKitchen Food"
                                className="h-10 md:h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    </Link>

                    {/* Right Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.slice(2).map((item) => (
                            <a
                                key={item.name}
                                href={item.path}
                                className={`group relative text-sm font-bold tracking-wider uppercase transition-all duration-300 ${
                                    scrolled 
                                        ? 'text-gray-700 dark:text-gray-200 hover:text-orange-500' 
                                        : 'text-white/90 hover:text-white'
                                }`}
                            >
                                {item.name}
                                <span className={`absolute -bottom-1 left-0 w-0 h-0.5 rounded-full transition-all duration-300 group-hover:w-full ${
                                    scrolled ? 'bg-orange-500' : 'bg-white'
                                }`}></span>
                            </a>
                        ))}

                        {/* Admin Button */}
                        <Link
                            to="/admin"
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${
                                scrolled
                                    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30'
                                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                            }`}
                        >
                            <ChefHat size={18} />
                            Admin
                        </Link>

                        {/* Cart Button */}
                        <a
                            href="https://wa.me/1234567890"
                            className={`relative group flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 ${
                                scrolled
                                    ? 'bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-500'
                                    : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                            }`}
                        >
                            <ShoppingBag size={20} strokeWidth={2} />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
                        </a>
                    </div>

                    {/* Mobile Cart */}
                    <a 
                        href="https://wa.me/1234567890" 
                        className={`md:hidden relative p-2 rounded-xl transition-all ${
                            scrolled 
                                ? 'text-gray-800 hover:bg-gray-100' 
                                : 'text-white hover:bg-white/20'
                        }`}
                    >
                        <ShoppingBag size={24} strokeWidth={2} />
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
                    </a>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-[100] transition-all duration-500 ease-out md:hidden ${
                    isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
            >
                {/* Background with gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700"></div>
                
                {/* Decorative circles */}
                <div className="absolute top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 -right-20 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl"></div>
                
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
                    <div className="mb-12">
                        <div className="bg-white rounded-3xl p-4 shadow-2xl">
                            <img
                                src="/assets/logo.jpg"
                                alt="BiKitchen"
                                className="h-16 w-auto"
                            />
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex flex-col gap-6 text-center">
                        {navLinks.map((item, idx) => (
                            <Link
                                key={item.name}
                                to={item.path.startsWith('#') ? '/' : item.path}
                                className="text-4xl font-bold text-white hover:text-white/80 transition-all duration-300 transform hover:scale-110"
                                onClick={() => setIsOpen(false)}
                                style={{ 
                                    animationDelay: `${idx * 100}ms`,
                                    animation: isOpen ? 'slideInUp 0.5s ease-out forwards' : 'none'
                                }}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="w-24 h-1 bg-white/30 mx-auto mt-10 mb-8 rounded-full"></div>

                    {/* CTA */}
                    <a 
                        href="https://wa.me/1234567890" 
                        className="flex items-center gap-3 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
                        onClick={() => setIsOpen(false)}
                    >
                        <ShoppingBag size={22} />
                        <span>Hacer Pedido</span>
                    </a>
                </div>
            </div>

            {/* Animation keyframes */}
            <style>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}
