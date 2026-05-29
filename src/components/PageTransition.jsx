import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Detectar si es móvil de forma segura (SSR-safe)
const getIsMobile = () => {
    if (typeof window === 'undefined') return true; // Default a móvil para SSR
    return window.innerWidth < 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Variantes simples y seguras (sin blur para evitar problemas de renderizado)
const pageVariants = {
    initial: {
        opacity: 0,
        y: 15
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.35,
            ease: [0.25, 0.1, 0.25, 1]
        }
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.2
        }
    }
};

/**
 * PageTransition Component
 * 
 * Wraps page content to provide smooth enter/exit animations using Framer Motion.
 * Optimizado: sin blur para mejor compatibilidad en todos los dispositivos.
 */
export default function PageTransition({ children }) {
    const [isMobile, setIsMobile] = useState(getIsMobile);

    useEffect(() => {
        setIsMobile(getIsMobile());
    }, []);

    // Scroll al inicio cuando se monta el componente
    useEffect(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
    }, []);

    return (
        <motion.div
            id="main-content"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
            onAnimationStart={() => {
                window.scrollTo(0, 0);
            }}
        >
            {children}
        </motion.div>
    );
}
