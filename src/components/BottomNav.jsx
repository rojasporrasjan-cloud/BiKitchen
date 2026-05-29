import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Package, Utensils, Gift, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUI } from '../context/UIContext';

export default function BottomNav() {
  const { isMobileMenuOpen } = useUI();
  const location = useLocation();
  const [isHeroArea, setIsHeroArea] = useState(false);

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
        <NavItem to="/promociones" icon={<Gift size={22} />} label="Promos" />
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
