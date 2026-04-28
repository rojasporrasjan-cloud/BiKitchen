import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Package, Utensils, ShoppingCart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';

export default function BottomNav() {
  const { cart, setIsCartOpen } = useCart();
  const { isMobileMenuOpen } = useUI();
  const location = useLocation();
  const [isBouncing, setIsBouncing] = useState(false);
  const [isHeroArea, setIsHeroArea] = useState(false);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Detectar si estamos en el hero (scroll cercano al top en landing page) - v1.1 Brute Force
  useEffect(() => {
    const checkScroll = () => {
      const isLanding = location.pathname === '/' || location.pathname === '/home';
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      // Umbral agresivo: deja de ser hero apenas se baja un poquito
      setIsHeroArea(isLanding && scrollY < 15);
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    const interval = setInterval(checkScroll, 100);
    checkScroll();
    return () => {
      window.removeEventListener('scroll', checkScroll);
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Animación de rebote cuando el carrito cambia
  React.useEffect(() => {
    if (cartCount > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  // No mostrar BottomNav si el menú lateral móvil o el carrito están abiertos
  // ni en rutas de administrador o perfil
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isProfileRoute = location.pathname === '/mi-cuenta';
  
  if (isMobileMenuOpen || isAdminRoute || isProfileRoute) return null;

  return (
    <nav 
      style={{ 
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 16px))',
        backgroundColor: isHeroArea ? 'transparent' : '#FFFFFF',
        borderTop: isHeroArea ? '1px solid transparent' : '1px solid #F3F4F6',
        boxShadow: isHeroArea ? 'none' : '0 -10px 30px rgba(0,0,0,0.08)',
        transition: 'all 0.4s ease'
      }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto relative">
        <NavItem to="/" icon={<Home size={22} />} label="Inicio" />
        <NavItem to="/packs" icon={<Package size={22} />} label="Packs" />
        <NavItem to="/individuales" icon={<Utensils size={22} />} label="Menú" />
        
        {/* Carrito como botón especial con animación mejorada */}
        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 group relative transition-all active:scale-95"
        >
          <motion.div 
            className={`p-1.5 rounded-xl transition-all duration-300 ${cartCount > 0 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-50 text-gray-400 border border-gray-100/50'}`}
            animate={isBouncing ? { scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ShoppingCart size={20} strokeWidth={2.5} />
            {cartCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={cartCount}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md ring-2 ring-white"
              >
                {cartCount}
              </motion.span>
            )}
          </motion.div>
          <span className={`text-[10px] font-black tracking-tight transition-all ${cartCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Carrito</span>
        </button>

        <NavItem to="/mi-cuenta" icon={<div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100/50"><User size={20} /></div>} label="Perfil" />
      </div>
    </nav>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex flex-col items-center gap-1 transition-all active:scale-90
        ${isActive ? 'text-bikitchen-orange' : 'text-gray-400'}
      `}
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            {icon}
            {isActive && (
              <motion.div 
                layoutId="bottom-nav-indicator"
                className="absolute -top-1 -right-1 w-2 h-2 bg-bikitchen-orange rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </div>
          <span className={`text-[10px] font-black transition-all duration-300 ${isActive ? 'text-orange-600 scale-110 tracking-wide' : 'text-gray-400'}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}
