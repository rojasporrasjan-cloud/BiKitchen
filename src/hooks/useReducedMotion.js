import { useState, useEffect } from 'react';

/**
 * Hook para detectar si el usuario prefiere movimiento reducido
 * o si tiene una conexión lenta
 */
export default function useReducedMotion() {
    const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

    useEffect(() => {
        // Check user preference for reduced motion
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setShouldReduceMotion(mediaQuery.matches);

        const handleChange = (e) => {
            setShouldReduceMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return shouldReduceMotion;
}

/**
 * Hook para detectar conexión lenta
 */
export function useSlowConnection() {
    const [isSlowConnection, setIsSlowConnection] = useState(false);

    useEffect(() => {
        // Check Network Information API
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            const checkConnection = () => {
                // Consider slow if: 2g, slow-2g, or saveData is enabled
                const slowTypes = ['slow-2g', '2g', '3g'];
                const isSlow = slowTypes.includes(connection.effectiveType) || connection.saveData;
                setIsSlowConnection(isSlow);
            };

            checkConnection();
            connection.addEventListener('change', checkConnection);
            return () => connection.removeEventListener('change', checkConnection);
        }
    }, []);

    return isSlowConnection;
}

/**
 * Hook combinado para performance
 */
export function usePerformanceMode() {
    const prefersReducedMotion = useReducedMotion();
    const isSlowConnection = useSlowConnection();
    
    // También detectar dispositivos de gama baja
    const [isLowEndDevice, setIsLowEndDevice] = useState(false);
    
    useEffect(() => {
        // Check hardware concurrency (CPU cores)
        const cores = navigator.hardwareConcurrency || 4;
        // Check device memory (in GB)
        const memory = navigator.deviceMemory || 4;
        
        // Consider low-end if less than 4 cores or less than 4GB RAM
        setIsLowEndDevice(cores < 4 || memory < 4);
    }, []);

    return {
        shouldReduceMotion: prefersReducedMotion || isSlowConnection || isLowEndDevice,
        isSlowConnection,
        isLowEndDevice,
        prefersReducedMotion
    };
}
