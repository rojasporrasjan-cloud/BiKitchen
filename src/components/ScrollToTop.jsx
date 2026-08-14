import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - Hace scroll al inicio de la página cuando cambia la ruta
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    // Función para forzar scroll al inicio
    const scrollToTop = () => {
        // Múltiples métodos para asegurar compatibilidad
        window.scrollTo(0, 0);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // También intentar con el elemento main si existe
        const main = document.querySelector('main');
        if (main) main.scrollTop = 0;
        
        // Y cualquier contenedor con overflow que no tenga data-scroll-persist
        document.querySelectorAll('[class*="overflow"]:not([data-scroll-persist])').forEach(el => {
            el.scrollTop = 0;
        });
    };

    // useLayoutEffect se ejecuta antes del render - SINCRÓNICO
    useLayoutEffect(() => {
        scrollToTop();
    }, [pathname]);

    // También con useEffect para después del render
    useEffect(() => {
        scrollToTop();
        
        // Múltiples intentos con delays
        const timers = [
            setTimeout(scrollToTop, 0),
            setTimeout(scrollToTop, 50),
            setTimeout(scrollToTop, 100),
            setTimeout(scrollToTop, 200)
        ];
        
        return () => timers.forEach(clearTimeout);
    }, [pathname]);

    return null;
}
