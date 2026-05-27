import React, { useEffect, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChristmas } from '../context/ChristmasContext';

// Snowflake component
const Snowflake = memo(({ style }) => (
    <div
        className="snowflake pointer-events-none"
        style={style}
    >
        ❄
    </div>
));

Snowflake.displayName = 'Snowflake';

// Snow effect component
export function SnowEffect() {
    const { isChristmasMode } = useChristmas();
    const [snowflakes, setSnowflakes] = useState([]);
    const [isMobile, setIsMobile] = useState(false);

    // Detectar móvil para reducir copos de nieve
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const createSnowflake = useCallback((id) => {
        return {
            id,
            created: Date.now(),
            left: Math.random() * 100,
            animationDuration: 8 + Math.random() * 12,
            animationDelay: Math.random() * 5,
            size: 10 + Math.random() * 15,
            opacity: 0.4 + Math.random() * 0.6
        };
    }, []);

    useEffect(() => {
        if (!isChristmasMode) {
            setSnowflakes([]);
            return;
        }

        // Menos copos en móvil para mejor rendimiento
        const maxFlakes = isMobile ? 15 : 40;
        const initialCount = isMobile ? 10 : 30;
        const intervalTime = isMobile ? 1000 : 500;

        // Create initial snowflakes
        const initialFlakes = Array.from({ length: initialCount }, (_, i) => createSnowflake(i));
        setSnowflakes(initialFlakes);

        // Add new snowflakes periodically
        const interval = setInterval(() => {
            setSnowflakes(prev => {
                // Remove old snowflakes and add new ones
                const filtered = prev.filter(f => Date.now() - f.created < 15000);
                if (filtered.length < maxFlakes) {
                    return [...filtered, createSnowflake(Date.now())];
                }
                return filtered;
            });
        }, intervalTime);

        return () => clearInterval(interval);
    }, [isChristmasMode, isMobile, createSnowflake]);

    if (!isChristmasMode) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {snowflakes.map(flake => (
                <Snowflake
                    key={flake.id}
                    style={{
                        position: 'absolute',
                        left: `${flake.left}%`,
                        top: '-20px',
                        fontSize: `${flake.size}px`,
                        opacity: flake.opacity,
                        color: 'white',
                        textShadow: '0 0 5px rgba(255,255,255,0.8)',
                        animation: `snowfall ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
                        filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))'
                    }}
                />
            ))}
            <style>{`
                @keyframes snowfall {
                    0% {
                        transform: translateY(0) rotate(0deg) translateX(0);
                        opacity: 1;
                    }
                    25% {
                        transform: translateY(25vh) rotate(90deg) translateX(10px);
                    }
                    50% {
                        transform: translateY(50vh) rotate(180deg) translateX(-10px);
                    }
                    75% {
                        transform: translateY(75vh) rotate(270deg) translateX(10px);
                    }
                    100% {
                        transform: translateY(105vh) rotate(360deg) translateX(0);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}

// Christmas toggle button
export function ChristmasToggle({ hideWhenCartOpen = false, isCartOpen = false }) {
    const { isChristmasMode, toggleChristmasMode } = useChristmas();
    
    // No mostrar si el carrito está abierto
    if (hideWhenCartOpen && isCartOpen) return null;

    return (
        <motion.button
            onClick={toggleChristmasMode}
            className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-3xl transition-all duration-300 ${
                isChristmasMode 
                    ? 'bg-gradient-to-br from-red-600 via-red-500 to-green-600 text-white shadow-red-500/50 animate-pulse' 
                    : 'bg-white text-gray-400 hover:text-red-500 hover:shadow-2xl'
            }`}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            title={isChristmasMode ? 'Desactivar modo navideño' : 'Activar modo navideño'}
        >
            <AnimatePresence mode="wait">
                {isChristmasMode ? (
                    <motion.span
                        key="tree"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                    >
                        🎄
                    </motion.span>
                ) : (
                    <motion.span
                        key="snow"
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -180 }}
                    >
                        ❄️
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}

// Christmas banner for landing page
// TODO: Este banner será reemplazado por un sistema de banners configurables desde admin
// Por ahora está deshabilitado - el sistema de cupones se maneja desde Admin > Cupones
export function ChristmasBanner() {
    // Banner deshabilitado temporalmente
    // El sistema de cupones funciona desde Admin > Cupones
    // Para crear un cupón de bienvenida, ir a Admin > Cupones > Nuevo Cupón
    return null;
    
    /* CÓDIGO ORIGINAL COMENTADO - NO BORRAR
    const { isChristmasMode } = useChristmas();
    const [dismissed, setDismissed] = useState(() => {
        return sessionStorage.getItem('christmas_banner_dismissed') === 'true';
    });
    const [navbarVisible, setNavbarVisible] = useState(true);

    // Escuchar cambios de visibilidad del navbar
    useEffect(() => {
        const handleVisibilityChange = (e) => {
            setNavbarVisible(e.detail.visible);
        };
        window.addEventListener('navbarVisibilityChange', handleVisibilityChange);
        return () => window.removeEventListener('navbarVisibilityChange', handleVisibilityChange);
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('christmas_banner_dismissed', 'true');
    };

    if (!isChristmasMode || dismissed) return null;

    return (
        <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: navbarVisible ? 0 : -100, opacity: navbarVisible ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-green-600 text-white py-1 px-3 text-center shadow-sm"
        >
            <div className="container flex items-center justify-center gap-1.5 pr-6">
                <span className="text-sm">🎄</span>
                <p className="text-[10px] md:text-xs font-medium">
                    Código: <span className="font-bold bg-white/30 px-1.5 py-0.5 rounded text-[10px] md:text-xs">NAVIDAD15</span>
                    <span className="hidden xs:inline"> = 15% OFF</span>
                </p>
                <span className="text-sm">🎅</span>
            </div>
            <button
                onClick={handleDismiss}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1 text-xs"
                aria-label="Cerrar banner"
            >
                ✕
            </button>
        </motion.div>
    );
    */
}

// Christmas decorations for cards/sections
export function ChristmasDecorations({ position = 'top-right' }) {
    const { isChristmasMode } = useChristmas();

    if (!isChristmasMode) return null;

    const positions = {
        'top-right': 'top-0 right-0',
        'top-left': 'top-0 left-0',
        'bottom-right': 'bottom-0 right-0',
        'bottom-left': 'bottom-0 left-0'
    };

    return (
        <div className={`absolute ${positions[position]} pointer-events-none`}>
            <span className="text-2xl opacity-80">🎄</span>
        </div>
    );
}

// Wrapper component that adds all Christmas effects
export default function ChristmasEffects({ isCartOpen = false }) {
    const { isChristmasMode } = useChristmas();

    return (
        <>
            <SnowEffect />
            <ChristmasToggle hideWhenCartOpen={true} isCartOpen={isCartOpen} />
            {isChristmasMode && (
                <style>{`
                    /* Christmas mode global styles */
                    .christmas-mode {
                        --christmas-red: #dc2626;
                        --christmas-green: #16a34a;
                        --christmas-gold: #fbbf24;
                        --christmas-white: #f8fafc;
                    }
                    
                    /* Override primary orange colors with Christmas gradient */
                    .christmas-mode .bg-bikitchen-orange,
                    .christmas-mode .bg-gradient-to-r.from-bikitchen-orange {
                        background: linear-gradient(135deg, #dc2626 0%, #16a34a 100%) !important;
                    }
                    
                    /* Fix: Solid color bar at top to prevent gradient bleed through navbar area */
                    .christmas-mode::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 100px;
                        background: linear-gradient(to bottom, #f97316 0%, #f97316 40%, transparent 100%);
                        z-index: 35;
                        pointer-events: none;
                    }
                    
                    /* Specific button gradients - preserve original colors but add Christmas tint */
                    .christmas-mode button.bg-gradient-to-r.from-orange-500.to-amber-500,
                    .christmas-mode button.bg-gradient-to-r.from-bikitchen-orange.to-orange-500,
                    .christmas-mode a.bg-gradient-to-r.from-orange-500.to-amber-500,
                    .christmas-mode a.bg-gradient-to-r.from-bikitchen-orange.to-orange-500,
                    .christmas-mode span.bg-gradient-to-r.from-orange-500.to-amber-500,
                    .christmas-mode span.bg-gradient-to-r.from-orange-400.to-amber-400,
                    .christmas-mode span.bg-gradient-to-r.from-pink-500.to-orange-500,
                    .christmas-mode h2.bg-gradient-to-r.from-orange-500.to-amber-500.text-white,
                    .christmas-mode h1.bg-gradient-to-r.from-orange-500.to-amber-500.text-white,
                    .christmas-mode h3.bg-gradient-to-r.from-orange-500.to-amber-500.text-white {
                        background: linear-gradient(to right, #dc2626 0%, #16a34a 100%) !important;
                    }
                    
                    .christmas-mode button.bg-gradient-to-r.from-red-500.to-rose-500,
                    .christmas-mode a.bg-gradient-to-r.from-red-500.to-rose-500 {
                        background: linear-gradient(to right, #b91c1c 0%, #15803d 100%) !important;
                    }
                    
                    .christmas-mode button.bg-gradient-to-r.from-amber-400.to-yellow-500,
                    .christmas-mode a.bg-gradient-to-r.from-amber-400.to-yellow-500 {
                        background: linear-gradient(to right, #dc2626 0%, #fbbf24 100%) !important;
                    }
                    
                    /* Gradient backgrounds for badges and containers - EXCLUDING pack card headers */
                    .christmas-mode .bg-gradient-to-r.from-purple-500.to-pink-500,
                    .christmas-mode .bg-gradient-to-br.from-purple-500.to-pink-500,
                    .christmas-mode .bg-gradient-to-r.from-orange-50.to-amber-50,
                    .christmas-mode .bg-gradient-to-br.from-orange-50.to-amber-50 {
                        background: linear-gradient(to right, #dc2626, #16a34a) !important;
                    }
                    
                    /* Preserve pack card header gradients - DO NOT override */
                    .christmas-mode div.bg-gradient-to-r.from-red-500.to-rose-500 {
                        background: linear-gradient(to right, #ef4444, #f43f5e) !important;
                    }
                    .christmas-mode div.bg-gradient-to-r.from-amber-400.to-yellow-500 {
                        background: linear-gradient(to right, #fbbf24, #eab308) !important;
                    }
                    
                    /* Force text visibility in pack cards */
                    .christmas-mode .text-gray-500,
                    .christmas-mode .text-gray-600 {
                        color: #374151 !important;
                    }
                    .christmas-mode .text-gray-800,
                    .christmas-mode .text-gray-900 {
                        color: #111827 !important;
                    }
                    
                    /* Preserve amber/yellow colors for Desayunos card */
                    .christmas-mode .text-amber-500,
                    .christmas-mode .text-amber-600 {
                        color: #d97706 !important;
                    }
                    .christmas-mode .bg-amber-500,
                    .christmas-mode .bg-amber-400 {
                        background-color: #f59e0b !important;
                    }
                    .christmas-mode .border-amber-400,
                    .christmas-mode .border-amber-200 {
                        border-color: #fbbf24 !important;
                    }
                    
                    /* Borders naranjas a rojos/verdes en modo navideño */
                    .christmas-mode .border-orange-500,
                    .christmas-mode .border-orange-400,
                    .christmas-mode .border-orange-200,
                    .christmas-mode .ring-orange-500 {
                        border-color: #dc2626 !important;
                        --tw-ring-color: #dc2626 !important;
                    }
                    
                    /* Texto naranja a verde navideño */
                    .christmas-mode .text-orange-600 {
                        color: #16a34a !important;
                    }
                    
                    /* Force white text to remain white on Christmas gradient backgrounds */
                    .christmas-mode button.bg-gradient-to-r.text-white,
                    .christmas-mode button.bg-gradient-to-r .text-white,
                    .christmas-mode button.bg-gradient-to-r,
                    .christmas-mode a.bg-gradient-to-r.text-white,
                    .christmas-mode a.bg-gradient-to-r .text-white,
                    .christmas-mode span.bg-gradient-to-r.text-white,
                    .christmas-mode span.bg-gradient-to-r,
                    .christmas-mode div.bg-gradient-to-r.text-white,
                    .christmas-mode div.bg-gradient-to-br.text-white {
                        color: white !important;
                    }
                    
                    /* Ensure text inside gradient backgrounds stays white */
                    .christmas-mode .bg-gradient-to-r.from-orange-500.text-white,
                    .christmas-mode .bg-gradient-to-r.from-pink-500.text-white,
                    .christmas-mode .bg-gradient-to-r.from-bikitchen-orange.text-white,
                    .christmas-mode .bg-gradient-to-br.from-orange-500.text-white {
                        color: white !important;
                    }
                    
                    /* Hover states for buttons */
                    .christmas-mode button.bg-gradient-to-r:hover,
                    .christmas-mode a.bg-gradient-to-r:hover {
                        filter: brightness(1.1);
                    }
                    
                    /* Text gradients - only for heading elements WITHOUT text-white */
                    .christmas-mode h1.bg-gradient-to-r.from-orange-500.to-amber-500:not(.text-white),
                    .christmas-mode h2.bg-gradient-to-r.from-orange-500.to-amber-500:not(.text-white),
                    .christmas-mode h3.bg-gradient-to-r.from-orange-500.to-amber-500:not(.text-white),
                    .christmas-mode p.bg-gradient-to-r.from-orange-500.to-amber-500:not(.text-white) {
                        background: linear-gradient(to right, #dc2626, #16a34a) !important;
                        -webkit-background-clip: text !important;
                        background-clip: text !important;
                    }
                    
                    /* Text gradients with bg-clip-text class */
                    .christmas-mode .bg-clip-text.from-orange-500.to-amber-500,
                    .christmas-mode .bg-clip-text.from-orange-600.to-amber-600 {
                        background: linear-gradient(to right, #dc2626, #16a34a) !important;
                        -webkit-background-clip: text !important;
                        background-clip: text !important;
                    }
                    
                    .christmas-mode h1.from-red-500.to-rose-500,
                    .christmas-mode h2.from-red-500.to-rose-500,
                    .christmas-mode h3.from-red-500.to-rose-500,
                    .christmas-mode span.from-red-500.to-rose-500,
                    .christmas-mode p.from-red-500.to-rose-500,
                    .christmas-mode div.from-red-500.to-rose-500,
                    .christmas-mode .bg-clip-text.from-red-500.to-rose-500 {
                        background: linear-gradient(to right, #b91c1c, #15803d) !important;
                        -webkit-background-clip: text !important;
                        background-clip: text !important;
                    }
                    
                    .christmas-mode h1.from-amber-500.to-yellow-500,
                    .christmas-mode h2.from-amber-500.to-yellow-500,
                    .christmas-mode h3.from-amber-500.to-yellow-500,
                    .christmas-mode span.from-amber-500.to-yellow-500,
                    .christmas-mode p.from-amber-500.to-yellow-500,
                    .christmas-mode div.from-amber-500.to-yellow-500,
                    .christmas-mode .bg-clip-text.from-amber-400.to-yellow-500,
                    .christmas-mode .bg-clip-text.from-amber-500.to-yellow-500 {
                        background: linear-gradient(to right, #dc2626, #fbbf24) !important;
                        -webkit-background-clip: text !important;
                        background-clip: text !important;
                    }
                    
                    /* Hero sections */
                    .christmas-mode header.bg-gradient-to-br {
                        background: linear-gradient(to bottom right, #dc2626, #16a34a, #b91c1c) !important;
                    }
                    
                    /* Borders and hover states */
                    .christmas-mode .hover\:border-orange-200:hover,
                    .christmas-mode .hover\:border-orange-300:hover {
                        border-color: #16a34a !important;
                    }
                    
                    .christmas-mode .border-orange-200,
                    .christmas-mode .border-orange-500 {
                        border-color: #16a34a !important;
                    }
                    
                    /* Shadows */
                    .christmas-mode .shadow-orange-500\/30,
                    .christmas-mode .shadow-orange-500\/50 {
                        box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.3), 0 8px 10px -6px rgba(22, 163, 74, 0.2) !important;
                    }
                    
                    .christmas-mode .shadow-red-500\/30,
                    .christmas-mode .shadow-red-500\/50 {
                        box-shadow: 0 10px 25px -5px rgba(185, 28, 28, 0.3), 0 8px 10px -6px rgba(21, 128, 61, 0.2) !important;
                    }
                    
                    .christmas-mode .shadow-amber-500\/30,
                    .christmas-mode .shadow-amber-500\/50 {
                        box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.3), 0 8px 10px -6px rgba(251, 191, 36, 0.2) !important;
                    }
                    
                    /* Text colors */
                    .christmas-mode .text-orange-400,
                    .christmas-mode .text-orange-500,
                    .christmas-mode .text-orange-600,
                    .christmas-mode .text-bikitchen-orange,
                    .christmas-mode .text-bikitchen-orange-dark,
                    .christmas-mode .text-bikitchen-gold {
                        color: #16a34a !important;
                    }
                    
                    .christmas-mode .text-amber-500,
                    .christmas-mode .text-amber-600 {
                        color: #fbbf24 !important;
                    }
                    
                    /* Hover text colors */
                    .christmas-mode .hover\:text-orange-600:hover,
                    .christmas-mode .hover\:text-bikitchen-orange:hover,
                    .christmas-mode .hover\:text-bikitchen-orange-dark:hover {
                        color: #15803d !important;
                    }
                    
                    /* Specific hex colors used in cards */
                    .christmas-mode .text-\\[\\#FF671D\\],
                    .christmas-mode .text-\\[\\#FF8C3A\\] {
                        color: #16a34a !important;
                    }
                    
                    .christmas-mode h3.text-\\[\\#FF671D\\],
                    .christmas-mode h3.text-\\[\\#FF8C3A\\],
                    .christmas-mode div.text-\\[\\#FF671D\\],
                    .christmas-mode div.text-\\[\\#FF8C3A\\],
                    .christmas-mode span.text-\\[\\#FF671D\\],
                    .christmas-mode span.text-\\[\\#FF8C3A\\] {
                        color: #16a34a !important;
                    }
                    
                    /* Background colors */
                    .christmas-mode .bg-orange-50,
                    .christmas-mode .from-orange-50 {
                        background-color: #dcfce7 !important;
                    }
                    
                    .christmas-mode .to-amber-50 {
                        background-color: #fef3c7 !important;
                    }
                    
                    /* Christmas glow effect */
                    .christmas-mode .christmas-glow {
                        box-shadow: 0 0 30px rgba(220, 38, 38, 0.4), 0 0 60px rgba(22, 163, 74, 0.3);
                    }
                    
                    /* Festive border */
                    .christmas-mode .christmas-border {
                        border-image: linear-gradient(90deg, #dc2626, #16a34a, #fbbf24, #dc2626) 1;
                    }
                    
                    /* Add festive decorations to body */
                    .christmas-mode::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #dc2626 0%, #16a34a 33%, #fbbf24 66%, #dc2626 100%);
                        z-index: 9999;
                        pointer-events: none;
                    }
                `}</style>
            )}
        </>
    );
}
