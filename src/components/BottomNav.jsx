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

  // Detectar si estamos en el hero (scroll cercano al top en landing page)
  useEffect(() => {
    const handleScroll = () => {
      const isLanding = location.pathname === '/';
      const scrollY = window.scrollY || window.pageYOffset;
      setIsHeroArea(isLanding && scrollY < 200);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Llamar al montar para establecer estado inicial
    return () => window.removeEventListener('scroll', handleScroll);
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
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 py-3 transition-all duration-300 ${
      isHeroArea
        ? 'bg-transparent border-t border-transparent'
        : 'bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'
    }`} style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 16px))' }}>
      <div className="flex items-center justify-between max-w-md mx-auto">
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
